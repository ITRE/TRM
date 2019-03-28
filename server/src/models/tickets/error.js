const mongoose = require('mongoose')
const Schema = mongoose.Schema

const ErrorSchema = new Schema({
  name: String,
  organization: String,
  title: String,
  use: String
})

module.exports = mongoose.model('Error', ErrorSchema)
