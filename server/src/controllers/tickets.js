const mongoose = require('mongoose')
const validator = require('validator')
const Ticket = mongoose.model('Ticket')
const Download = mongoose.model('Download')
const Other = mongoose.model('Other')

const validateTicket = (input) => {
  if (input === null || !input) {
    return next({name:'Missing'})
	} else if(validator.isEmpty(input.user) || validator.isEmpty(input.staff) || validator.isEmpty(input.subject) || validator.isEmpty(input.log.type) || validator.isEmpty(input.log.staff) || validator.isEmpty(input.log.note)) {
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
      subject: '',
      log: {
        type: '',
        date: '',
        staff: '',
        note: ''
      }
    }
    console.log("Input: ", input)

    validatedDoc.user = validator.normalizeEmail(input.user)

    validatedDoc.staff = validator.trim(input.staff)
    validatedDoc.staff = validator.escape(validatedDoc.staff)
    validatedDoc.staff = validator.blacklist(validatedDoc.staff, '$')

    validatedDoc.emailID = input.emailID ? input.emailID : ''

    validatedDoc.priority = validator.isIn(input.priority, ['Low', 'Normal', 'Medium', 'High', 'Urgent']) ? input.priority : 'Normal'
    validatedDoc.status = validator.isIn(input.status, ['New', 'Seen', 'In Progress', 'On Hold', 'Awaiting Reply', 'Completed', 'Closed', 'Reopened']) ? input.status : 'New'
    validatedDoc.kind = validator.isIn(input.kind, ['Download', 'Error', 'Other']) ? input.kind : 'Other'

    validatedDoc.subject = validator.trim(input.subject)
    validatedDoc.subject = validator.escape(validatedDoc.subject)
    validatedDoc.subject = validator.blacklist(validatedDoc.subject, '$')

    validatedDoc.log.type = validator.trim(input.log.type)
    validatedDoc.log.type = validator.escape(validatedDoc.log.type)
    validatedDoc.log.type = validator.blacklist(validatedDoc.log.type, '$')

    validatedDoc.log.date = input.log.date ? validator.toDate(input.log.date) : Date.now()

    validatedDoc.log.staff = validator.trim(input.log.staff)
    validatedDoc.log.staff = validator.escape(validatedDoc.log.staff)
    validatedDoc.log.staff = validator.blacklist(validatedDoc.log.staff, '$')

    validatedDoc.log.note = validator.trim(input.log.note)
    validatedDoc.log.note = validator.escape(validatedDoc.log.note)
    validatedDoc.log.note = validator.blacklist(validatedDoc.log.note, '$')

    return validatedDoc
  }
}

const validateSubTicket = (kind, input) => {
  let validatedDoc = {}
  console.log("Kind: ", kind)
  console.log("Input: ", input)

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
  console.log("Validated Sub Ticket: ", validatedDoc)
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
