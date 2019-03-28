const mongoose = require('mongoose')
const Schema = mongoose.Schema

const DownloadSchema = new Schema({
  name: String,
  organization: String,
  title: String,
  use: String
})

module.exports = mongoose.model('Download', DownloadSchema)
