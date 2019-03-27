const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const Schema = mongoose.Schema

const UserSchema = new Schema({
  name: String,
  email: {
    type: String,
    unique: true
  },
  organization: String,
  title: String,
  use: String
})


module.exports = mongoose.model('User', UserSchema)
