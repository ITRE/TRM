const mongoose = require('mongoose')
const validator = require('validator')
const h2p = require('html2plaintext')
const Ticket = mongoose.model('Ticket')
const Download = mongoose.model('Download')
const Other = mongoose.model('Other')

const validateTicket = (input) => {
  if (input === null || !input) {
    return ['error', {name:'Missing'}]
	} else if(validator.isEmpty(input.user) || validator.isEmpty(input.subject)) {
    return ['error', {name:'Missing'}]
	} else if(!validator.isEmail(input.user)) {
    return ['error', {name:'EmailError'}]
  } else {
    let validatedDoc = {
      user: '',
      staff: '',
      thread_id: '',
      priority: 'Normal',
      status: 'New',
      kind: '',
      info: '',
      subject: ''
    }

    validatedDoc.user = validator.normalizeEmail(input.user)
    if (input.staff !== '') {
      validatedDoc.staff = validator.trim(input.staff)
      validatedDoc.staff = validator.escape(validatedDoc.staff)
      validatedDoc.staff = validator.blacklist(validatedDoc.staff, '$')
    }

    validatedDoc.thread_id = input.thread_id ? input.thread_id : ''

    validatedDoc.priority = validator.isIn(input.priority, ['Low', 'Normal', 'Medium', 'High', 'Urgent']) ? input.priority : 'Normal'
    validatedDoc.status = validator.isIn(input.status, ['New', 'Seen', 'In Progress', 'On Hold', 'Awaiting Reply', 'Completed', 'Closed', 'Reopened']) ? input.status : 'New'
    validatedDoc.kind = validator.isIn(input.kind, ['Download', 'Error', 'Other']) ? input.kind : 'Other'

    validatedDoc.info = input.info ? input.info : ''

    validatedDoc.subject = validator.trim(input.subject)
    validatedDoc.subject = validator.escape(validatedDoc.subject)
    validatedDoc.subject = validator.blacklist(validatedDoc.subject, '$')

    return ['success', validatedDoc]
  }
}

const validateLog = (input) => {
  if (input === null || !input) {
    return ['error', {name:'Missing'}]
  } else if(validator.isEmpty(input.type) || validator.isEmpty(input.staff) || validator.isEmpty(input.note)) {
    return ['error', {name:'Missing'}]
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

    return ['success', validatedDoc]
  }
}

const parseEmail = (ticket, log) => {
  let parsedTicket = ticket;
  let parsedLog = log;
  const string = ticket.user; // Your string containing
  const regex = /<(.*)>/g; // The actual regex
  const matches = regex.exec(string);
  parsedTicket.user = matches[1];
  if (ticket.subject === 'Request for TRM' || ticket.subject === 'Re: Request for TRM' || ticket.subject === 'Fwd: Request for TRM') {
    parsedTicket.kind = 'Download';
    let desc = h2p(log.desc);
    parsedLog.name = /Name: (.*)./g.exec(desc)[1];
    parsedLog.title = /Title: (.*)./g.exec(desc)[1];
    parsedLog.organization = /Organization: (.*)./g.exec(desc)[1];
    parsedLog.use = /Use: (.*)./g.exec(desc)[1];
  } else {
    parsedTicket.kind = 'Other';
    if(h2p(log.desc)) {
      parsedLog.note = h2p(log.desc);
      parsedLog.use = h2p(log.desc);
    } else {
      parsedLog.note = 'Message Was Blank';
      parsedLog.use = 'Message Was Blank';
    }
  }
  return {parsedTicket, parsedLog}
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
      validatedDoc.desc = validator.escape(validatedDoc.desc)
      validatedDoc.desc = validator.blacklist(validatedDoc.desc, '$')
      break
    default:
      return 'Error'
  }
  return validatedDoc
}


exports.new_request = function(req, res, next) {
	let validatedDoc = validateSubTicket(req.body.ticket.kind, req.body.kind)
  if (validatedDoc == 'Error') {
    return next({name:'Missing'})
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
    if (validatedDoc[0] == 'error') {
      return next(validatedDoc[1])
    }
    validatedDoc[1].info = doc._id
    const new_ticket = new Ticket(validatedDoc[1])
    new_ticket.save(function(err, ticket) {
      if (err) {
				return next(err)
      }
      return res.status(201).send({success: true, data: [ticket, doc], req: req.body})
    })
  })
}

exports.update_request = function(req, res, next) {
  let validatedDoc = validateTicket(req.body.ticket)
  if (validatedDoc[0] == 'error') {
    return next(validatedDoc[1])
  }
  let validatedLog = validateLog(req.body.log)
  if (validatedLog[0] == 'error') {
    return next(validatedLog[1])
  }
  Ticket.findOneAndUpdate({
    "_id": req.params.id},
    { $set: validatedDoc[1], $push: {log: validatedLog[1]} },
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

exports.list_tickets = function(req, res, next) {
	Ticket.find({})
  .populate('info')
  .exec(function(err, docs) {
    if (err) {
			err.name = 'FindError'
      return next(err)
    }
    return res.status(200).send({success: true, data: docs})
  })
}

exports.list_admin_tickets = function(req, res, next) {
	Ticket.find({$or: [{"staff": req.params.id}, {"staff": ''}]})
  .populate('user')
  .populate('info')
  .exec(function(err, doc) {
    if (err) {
			err.name = 'FindError'
      return next(err)
    }
    return res.status(200).send({success: true, data: doc})
  })
}

exports.delete_tickets = function(req, res, next) {
  if (req.params.id === 'all') {
    Ticket.deleteMany({}, function(err, admin) {
      if (err) {
  			return next(err)
  		}
      res.json({ message: 'All Tickets Successfully Deleted' })
    })
  } else if(validator.isEmpty(req.params.id)) {
    return next({name:'Missing'})
  }  else {
    Ticket.deleteOne({
      "_id": req.params.id
    }, function(err, admin) {
      if (err) {
  			return next(err)
  		}
      res.json({ message: 'Ticket successfully deleted' })
    })
  }
}

/*****************************
* Handle Fetched New Mail
*****************************/

exports.check_thread = async function(req, res, next) {
  console.log('sorting...')
  req.body.new = [];
  req.body.old = [];
  for (let i = 0; i < req.body.responses.length; i++) {
    await Ticket.find({'thread_id': req.body.responses[i].ticket.thread_id}, function (err, ticket) {
      if (err) {
  			req.body.new.push(req.body.responses[i]);
        return
      } else {
        dupes = [...ticket.log]
        dupes.filter(log => (log.message_id === req.body.responses[i].log.message_id))
        console.log(dupes)
        if (dupes.length > 0) {
          return
        }
        req.body.old.push(req.body.responses[i]);
        return
      }
    }).catch(function(err) { console.error('error ignored') })
  }
  console.log('sorted')
  return next()
}

exports.update_tickets = async function(req, res, next) {
  if (!req.body.old) {
    console.log('no old')
    return next()
  } else if (req.body.old.length <= 0) {
    console.log('not enough old')
    return next()
  }
  console.log('updating...')

  for (let i = 0; i < req.body.old.length; i++) {
    let {parsedTicket, parsedLog} = parseEmail(req.body.old[i].ticket, req.body.old[i].log)
    let validatedLog = validateLog(parsedLog)
    if (validatedLog[0] == 'error') {
      return next(validatedLog[1])
    }
    console.log(parsedTicket.thread_id)

    await Ticket.findOneAndUpdate(
      {"thread_id": parsedTicket.thread_id},
      { $push: {log: validatedLog[1]} },
      { upsert: true, new: true }, function (err, ticket) {
      if (err) {
        return next(err)
      } else {
        return
      }
    }).catch(function(err) { return next(err) })

  }
  console.log('updated')
  return next()
}


exports.new_tickets = async function(req, res, next) {
  if (!req.body.new) {
    console.log('no new')
    return next()
  } else if (req.body.new.length <= 0) {
    console.log('not enough new')
    return next()
  }
  console.log('adding...')

  for (let i = 0; i < req.body.new.length; i++) {
    let {parsedTicket, parsedLog} = parseEmail(req.body.new[i].ticket, req.body.new[i].log)
    console.log('parsed:', parsedTicket)
    console.log('parsed:', parsedLog)
    let validatedDoc = validateSubTicket(parsedTicket.kind, parsedLog)
    if (validatedDoc == 'Error') {
      return next({name:'Missing'})
    }
    let sub_ticket
    switch (parsedTicket.kind) {
      case "Download":
        sub_ticket = new Download(validatedDoc)
        break
      case "Other":
        sub_ticket = new Other(validatedDoc)
        break
      default:
        return next({name:'Kind'})
    }
    try {
      let doc = await sub_ticket.save()
      validatedDoc = validateTicket(parsedTicket)
      if (validatedDoc[0] == 'error') {
        return next(validatedDoc[1])
      }
      validatedDoc[1].info = doc._id
      const new_ticket = new Ticket(validatedDoc[1]);
      let tic = await new_ticket.save()
    } catch (err) {
      return next(err)
    }
  }
}
