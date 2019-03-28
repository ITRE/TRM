const mongoose = require('mongoose')
const Schema = mongoose.Schema

const OtherSchema = new Schema({
  desc: String,
  attachments: String
})

module.exports = mongoose.model('Other', OtherSchema)
