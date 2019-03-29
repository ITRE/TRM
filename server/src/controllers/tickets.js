const mongoose = require('mongoose')
const validator = require('validator')
const Ticket = mongoose.model('Ticket')
const Download = mongoose.model('Download')
const Other = mongoose.model('Other')

const validateTicket = (input) => {
  if (input === null || !input) {
    return next({name:'Missing'})
	} else if(validator.isEmpty(input.user) || validator.isEmpty(input.staff) || validator.isEmpty(input.subject)) {
    return next({name:'Missing'})
	} else if(!validator.isEmail(input.user)) {
    return next({name:'EmailError'})
  } else {
    let validatedDoc = {
      user: '',
      staff: '',
      emailID: '',
      priority: 'Normal',
      status: 'New',
      kind: '',
      info: '',
      subject: ''
    }

    validatedDoc.user = validator.normalizeEmail(input.user)

    validatedDoc.staff = validator.trim(input.staff)
    validatedDoc.staff = validator.escape(validatedDoc.staff)
    validatedDoc.staff = validator.blacklist(validatedDoc.staff, '$')

    validatedDoc.thread_id = input.thread_id ? input.thread_id : ''

    validatedDoc.priority = validator.isIn(input.priority, ['Low', 'Normal', 'Medium', 'High', 'Urgent']) ? input.priority : 'Normal'
    validatedDoc.status = validator.isIn(input.status, ['New', 'Seen', 'In Progress', 'On Hold', 'Awaiting Reply', 'Completed', 'Closed', 'Reopened']) ? input.status : 'New'
    validatedDoc.kind = validator.isIn(input.kind, ['Download', 'Error', 'Other']) ? input.kind : 'Other'

    validatedDoc.info = input.info ? input.info : ''

    validatedDoc.subject = validator.trim(input.subject)
    validatedDoc.subject = validator.escape(validatedDoc.subject)
    validatedDoc.subject = validator.blacklist(validatedDoc.subject, '$')

    return validatedDoc
  }
}

const validateLog = (input) => {
  if (input === null || !input) {
    return next({name:'Missing'})
  } else if(validator.isEmpty(input.type) || validator.isEmpty(input.staff) || validator.isEmpty(input.note)) {
    return next({name:'Missing'})
  } else {
    let validatedDoc = {
      type: '',
      date: '',
      message_id: '',
      staff: '',
      note: ''
    }

    validatedDoc.type = validator.trim(input.type)
    validatedDoc.type = validator.escape(validatedDoc.type)
    validatedDoc.type = validator.blacklist(validatedDoc.type, '$')

    validatedDoc.date = input.date ? validator.toDate(input.date) : Date.now()

    validatedDoc.message_id = input.message_id ? input.message_id : ''

    validatedDoc.staff = validator.trim(input.staff)
    validatedDoc.staff = validator.escape(validatedDoc.staff)
    validatedDoc.staff = validator.blacklist(validatedDoc.staff, '$')

    validatedDoc.note = validator.trim(input.note)
    validatedDoc.note = validator.escape(validatedDoc.note)
    validatedDoc.note = validator.blacklist(validatedDoc.note, '$')

    return validatedDoc
  }
}

const validateSubTicket = (kind, input) => {
  let validatedDoc = {}

  switch (kind) {
    case "Download":
      validatedDoc.name = validator.trim(input.name)
      validatedDoc.name = validator.escape(input.name)
      validatedDoc.name = validator.blacklist(validatedDoc.name, '$')

      validatedDoc.title = validator.trim(input.title)
      validatedDoc.title = validator.escape(validatedDoc.title)
      validatedDoc.title = validator.blacklist(validatedDoc.title, '$')

      validatedDoc.organization = validator.trim(input.organization)
      validatedDoc.organization = validator.escape(validatedDoc.organization)
      validatedDoc.organization = validator.blacklist(validatedDoc.organization, '$')

      validatedDoc.use = validator.trim(input.use)
      validatedDoc.use = validator.escape(validatedDoc.use)
      validatedDoc.use = validator.blacklist(validatedDoc.use, '$')
      break
    case "Other":
      validatedDoc.desc = validator.trim(input.use)
      validatedDoc.desc = validator.escape(validatedDoc.use)
      validatedDoc.desc = validator.blacklist(validatedDoc.use, '$')
      break
    default:
      return 'Error'
  }
  return validatedDoc
}


exports.new_request = function(req, res, next) {
	let validatedDoc = validateSubTicket(req.body.ticket.kind, req.body.kind)
  if (validatedDoc === 'Error') {
    validatedDoc.name = 'Missing'
    return next(validatedDoc)
  }
  let sub_ticket
  switch (req.body.ticket.kind) {
    case "Download":
      sub_ticket = new Download(validatedDoc)
      break
    case "Other":
      sub_ticket = new Other(validatedDoc)
      break
    default:
      return next({name:'Kind'})
  }
  sub_ticket.save(function(err, doc) {
    if (err) {
      return next(err)
    }
    validatedDoc = validateTicket(req.body.ticket)
    validatedDoc.info = doc._id
    const new_ticket = new Ticket(validatedDoc)
    new_ticket.save(function(err, ticket) {
      if (err) {
				return next(err)
      }
      return res.status(201).send({success: true, data: [ticket, doc], req: req.body})
    })
  })
}

exports.update_request = function(req, res, next) {
  validatedDoc = validateTicket(req.body.ticket)
  validatedLog = validateLog(req.body.log)
  Ticket.findOneAndUpdate({
    "thread_id": validatedDoc.thread_id},
    { $set: validatedDoc, $push: {log: validatedLog} },
    { upsert: true, new: true }
  )
  .exec(function(err, ticket) {
    if (err) {
			err.name = 'UpdateError'
      return next(err)
    }
    return res.status(201).send({success: true, msg: "Ticket Successfully Updated.", data: ticket})
  })
}

exports.get_ticket = function(req, res, next) {
	Ticket.find({"_id": req.params.id})
  .populate('info')
  .exec(function(err, doc) {
    if (err) {
			err.name = 'FindError'
      return next(err)
    }
    return res.status(200).send({success: true, data: doc})
  })
}
