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

  const subject = email.subject
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
  return res.data
}

exports.send_response = function(req, res, next) {
  if (req.body === null || !req.body) {
    return next({name:'Missing'})
	} else if(validator.isEmpty(req.body.ticket) || validator.isEmpty(req.body.ticket.user) || validator.isEmpty(req.body.ticket.subject) || validator.isEmpty(req.body.log.message)) {
    return next({name:'Missing'})
	} else if(!validator.isEmail(req.body.ticket.user)) {
    return next({name:'EmailError'})
  } else {
    authenticate()
    .then(sendMail({
      user: req.body.ticket.user,
      subject: req.body.ticket.subject,
      message: req.body.log.message,
      thread_id: req.body.ticket.thread_id ? req.body.ticket.thread_id : ''
    }))
    .then((response)=>{
      console.log('Message Sent!')
      req.body.ticket.thread_id = response.threadId
      req.body.log.message_id = response.id
      next()
    })
    .catch(err => {
      return next(err)
    })
  }
}
