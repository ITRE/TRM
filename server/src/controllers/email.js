const nodemailer = require('nodemailer')
const googleAuth = require('google-auth-library')
const {auth} = require('google-auth-library')
const validator = require('validator')
const {google} = require('googleapis')
const { Base64 } = require('js-base64')

const mongoose = require('mongoose')
const User = mongoose.model('User')
const Admin = mongoose.model('Admin')
const config = require('../config/email')

/*
*   Gmail Generic Client Functions
*/

const authClient = new googleAuth.OAuth2Client(
  config.client_id,
  config.client_secret,
  config.redirect_uri
)

async function authenticate() {
  authClient.setCredentials({
     refresh_token: config.refresh_token
  })
  const tokens = await authClient.getAccessToken()
  authClient.setCredentials({
    access_token: tokens.token,
    refresh_token: config.refresh_token
  })
  return authClient
}

// Send email
async function sendMail(email) {
  const gmail = google.gmail({
    version: 'v1',
    auth: authClient
  })

  const subject = 'Re: ' + email.subject
  const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`
  const messageParts = [
    `From: ${email.from}`,
    `To: ${email.to}`,
    `Content-Type: text/html; charset=utf-8`,
    `MIME-Version: 1.0`,
    `Subject: ${utf8Subject}`,
    ``,
    email.message,
  ]
  const message = messageParts.join('\n')

  // The body needs to be base64url encoded.
  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const res = await gmail.users.messages.send({
    'userId': 'me',
    'resource': {
      'raw': encodedMessage,
      'threadID': email.thread_id
    },
  })
  console.log(res.data)
  return res.data
}

// Get new emails
async function fetchMail() {
  const gmail = google.gmail({
    version: 'v1',
    auth: authClient
  })

  const list = await gmail.users.messages.list({
    'userId': 'me',
    'q': 'is:unread'
  })
  let response = []

  for (let message of list.data.messages) {
    let res = await fetchResponse(message.id)
    response.push(res)
  }
  return response
}

async function fetchResponse(id) {
  const gmail = google.gmail({
    version: 'v1',
    auth: authClient
  })

  const response = await gmail.users.messages.get({
    'userId': 'me',
    'id': id
  })
  let ticket = {
    user: '',
    staff: '',
    thread_id: response.data.threadId,
    priority: 'Normal',
    status: 'New',
    kind: 'Other',
    subject: ''
  }
  let log = {
    note: ``,
    date: '',
    type: 'Response',
    staff: 'N/A',
    message_id: response.data.id,
    attachments: false
  }

  for (let head of response.data.payload.headers) {
    switch (head.name) {
      case 'From':
        ticket.user = head.value
      case 'Subject':
        ticket.subject = head.value
      case 'Date':
        log.date = head.value
      default:
        continue;
    }
  }

  for (let part of response.data.payload.parts) {
    if (part.filename && part.filename.length > 0) {
      log.attachments = true
    } else if (!part.body.data) {
      continue
    } else {
      log.desc += Base64.decode(part.body.data)
    }
  }

  return {ticket, log}
}

/*
*   Email Route Functions
*/

// Get New Messages
exports.fetch_responses = function(req, res, next) {
  authenticate()
  .then(fetchMail)
  .then(response => {
    req.body.responses = response
    console.log('fetched')
    return next()
  })
  .catch(err => {
    return next(err)
  })
}

// Send Ticket Response
exports.send_response = function(req, res, next) {
  if (req.body === null || !req.body) {
    return next({name:'Missing'})
	} else if(validator.isEmpty(req.body.ticket.user) || validator.isEmpty(req.body.ticket.subject) || validator.isEmpty(req.body.log.note)) {
    return next({name:'Missing'})
	} else if(!validator.isEmail(req.body.ticket.user)) {
    return next({name:'EmailError'})
  } else {
    authenticate()
    .then(client => {
      sendMail({
        user: req.body.ticket.user,
        subject: req.body.ticket.subject,
        message: req.body.log.note,
        thread_id: req.body.ticket.thread_id ? req.body.ticket.thread_id : ''
      }).then(response => {
        console.log('sent!', response)
        req.body.ticket.thread_id = response.threadId
        req.body.log.message_id = response.id
        next()
      })
      .catch(err => {
        return next(err)
      })
    })
    .catch(err => {
      return next(err)
    })
  }
}

// Send Password Reset
exports.send_reset = function(req, res, next) {
  const resetToken =  Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  Admin.findOneAndUpdate({"email": req.body.user},
    {$set: {resetPasswordToken: resetToken, resetPasswordExpires: Date.now() + 3600000}},
    {new: true})
  .exec(function(err, user) {
  	if (err) {
      err.name= 'UpdateError'
  		return next(err)
  	} else if (user === null) {
      return next({name:'NoUser', sent:req.body})
  	} else {
      authenticate()
      .then(client => {
        sendMail({
          to: req.body.user,
          from: config.email,
          subject: 'Password Reset',
          message: `You are recieving this email because you requested a reset of your password.
            <br />
            <strong><em>If you did not request this email, please contact your administrator immediately.</em></strong>
            <br /><br />
            Click the link below to reset your password.
            <br /><br />
            <a href="http://localhost:3000/login/${req.body.user}/${resetToken}">Reset My Password</a>`
        }).then(response => {
          return res.status(200).send({success: true, msg: "An email has been sent to your address."})
        })
        .catch(err => {
          return next(err)
        })
      })
      .catch(err => {
        return next(err)
      })
    }
  })
}

// Send Password Reset
exports.request_download = function(req, res, next) {
  if (req.body === null || !req.body) {
    return next({name:'Missing'})
  } else if(!validator.isEmail(req.body.kind.email)) {
    return next({name:'EmailError'})
  } else {
    authenticate()
    .then(client => {
      sendMail({
        to: config.email,
        from: req.body.kind.email,
        subject: 'Request for TRM',
        message: `This is an automated request from the website for access to TRM.
          <br />
          Name: ${req.body.kind.name}
          <br />
          Organization: ${req.body.kind.organization}
          <br />
          Title: ${req.body.kind.title}
          <br />
          Use: ${req.body.kind.use}
          <br />`
      }).then(response => {
        req.body.response = response
        req.body.ticket.thread_id = response.threadId;
        return next()
      })
      .catch(err => {
        return next(err)
      })
    })
    .catch(err => {
      return next(err)
    })
  }
}
