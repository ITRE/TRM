const mongoose = require('mongoose')
const validator = require('validator')
const User = mongoose.model('User')
const config = require('../config/database')

function generateToken(user) {
  return jwt.sign(user, config.secret, {
    expiresIn: '30m'
  })
}


exports.create_user = function(req, res, next) {
	if (req.body === null || !req.body) {
    return next({name:'Missing'})
	} else if(validator.isEmpty(req.body.email) || validator.isEmpty(req.body.name) || validator.isEmpty(req.body.title) || validator.isEmpty(req.body.organization) || validator.isEmpty(req.body.use)) {
    return next({name:'Missing'})
	} else if(!validator.isEmail(req.body.email)) {
    return next({name:'Email'})
  } else {
    let validatedDoc = {
      name: '',
      email: '',
      organization: '',
      title: '',
      use: ''
    }
    validatedDoc.email = validator.normalizeEmail(req.body.email)

    validatedDoc.name = validator.trim(req.body.name)
    validatedDoc.name = validator.escape(req.body.name)
    validatedDoc.name = validator.blacklist(validatedDoc.name, '$')

    validatedDoc.title = validator.trim(req.body.title)
    validatedDoc.title = validator.escape(validatedDoc.title)
    validatedDoc.title = validator.blacklist(validatedDoc.title, '$')

    validatedDoc.organization = validator.trim(req.body.organization)
    validatedDoc.organization = validator.escape(validatedDoc.organization)
    validatedDoc.organization = validator.blacklist(validatedDoc.organization, '$')

    validatedDoc.use = validator.trim(req.body.use)
    validatedDoc.use = validator.escape(validatedDoc.use)
    validatedDoc.use = validator.blacklist(validatedDoc.use, '$')

    console.log(validatedDoc)

    User.create(validatedDoc, function (err, doc) {
      if (err) {
        console.log('shit')
        return next(err)
      } else {
        console.log(doc)
        return res.status(201).send({success: true, data: doc})
      }
    })
	}
}
