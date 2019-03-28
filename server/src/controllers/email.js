const nodemailer = require('nodemailer')
const googleAuth = require('google-auth-library')
const {auth} = require('google-auth-library')

const mongoose = require('mongoose')
const User = mongoose.model('User')
const config = require('../config/email')

const scope= "https://mail.google.com/"

async function main() {
  const oauth2Client = new googleAuth.OAuth2Client(
    config.client_id,
    config.client_secret,
    config.redirect_uris[0]
  )
  oauth2Client.setCredentials({
     refresh_token: config.refresh_token
  });
  const tokens = await oauth2Client.getAccessToken()
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: "itre-information@ncsu.edu",
      accessToken: tokens.token
    }
  })
}
