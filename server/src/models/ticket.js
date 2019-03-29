const mongoose = require('mongoose')
const Schema = mongoose.Schema

const NoteSchema = new Schema({
  type: String,
  date: {
    type: Date,
    default: Date.now
  },
  message_id: String,
  staff: String,
  note: String
})

const TicketSchema = new Schema({
  user: String,
  staff: String,
  thread_id: String,
  added: {
    type: Date,
    default: Date.now
  },
  priority: {
    type: String,
    default: 'Normal',
		enum: ['Low', 'Normal', 'Medium', 'High', 'Urgent']
  },
  status: {
    type: String,
    default: 'New',
		enum: ['New', 'Seen', 'In Progress', 'On Hold', 'Awaiting Reply', 'Completed', 'Closed', 'Reopened']
  },
  kind: {
		type: String,
		enum: ['Download', 'Other']
	},
  subject: String,
  info: {type: Schema.Types.ObjectId, refPath: 'kind'},
  log: [NoteSchema]
})


module.exports = mongoose.model('Ticket', TicketSchema)
