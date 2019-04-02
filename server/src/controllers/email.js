const nodemailer = require('nodemailer')
const googleAuth = require('google-auth-library')
const {auth} = require('google-auth-library')
const validator = require('validator')
const {google} = require('googleapis')
const { Base64 } = require('js-base64')

const mongoose = require('mongoose')
const User = mongoose.model('User')
const config = require('../config/email')

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

async function sendMail(email) {
  const gmail = google.gmail({
    version: 'v1',
    auth: authClient
  })

  const subject = 'Re: ' + email.subject
  const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`
  const messageParts = [
    `From: ${config.email}`,
    `To: ${email.user}`,
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

async function fetchMail() {
  const gmail = google.gmail({
    version: 'v1',
    auth: authClient
  })

  const list = await gmail.users.messages.list({
    'userId': 'me',
    'q': 'is:unread'
  })
  console.log(list.data)
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
  let kind = {
    desc: ``,
    attachments: false
  }

  for (let head of response.data.payload.headers) {
    switch (head.name) {
      case 'From':
        ticket.user = head.value
      case 'Subject':
        ticket.subject = head.value
      default:
        continue;
    }
  }

  for (let part of response.data.payload.parts) {
    if (part.filename && part.filename.length > 0) {
      kind.attachments = true
    } else if (!part.body.data) {
      continue
    } else {
      kind.desc += Base64.decode(part.body.data)
    }
  }

  return {ticket, kind}

}

exports.fetch_responses = function(req, res, next) {
  authenticate()
  .then(fetchMail)
  .then(response => {
    return res.status(201).send({success: true, msg: "Fetched.", data: response})
  })
  .catch(err => {
    return next(err)
  })
}

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
