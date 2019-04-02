const mongoose = require('mongoose')
const Schema = mongoose.Schema

const OtherSchema = new Schema({
  desc: String,
  attachments: Boolean
})

module.exports = mongoose.model('Other', OtherSchema)
