const mongoose = require('mongoose')
const validator = require('validator')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const config = require('../config/database')
const passportService = require('../config/passport')
const passport = require('passport')
const Admin = mongoose.model('Admin')

function generateToken(admin) {
  return jwt.sign(admin, config.secret, {
    expiresIn: '30m'
  })
}

exports.list_admins = function(req, res, next) {
  Admin.find({})
    .exec(function(err, doc) {
      if (err) {
	      return next({name: 'FindError'})
      }
      return res.status(200).send({success: true, data: doc})
  })
}

exports.create_admin = function(req, res, next) {
  if (req.body === null || !req.body) {
    return next({name:'Missing'})
	} else if(validator.isEmpty(req.body.username) || validator.isEmpty(req.body.name) || validator.isEmpty(req.body.email) || validator.isEmpty(req.body.password)) {
    return next({name:'Missing'})
	} else if(!validator.isEmail(req.body.email)) {
    return next({name:'EmailError'})
  } else {
    let validatedDoc = {
      username: '',
      name: '',
      email: '',
      password: req.body.password
    }

    validatedDoc.email = validator.normalizeEmail(req.body.email)
    validatedDoc.name = validator.trim(req.body.name)
    validatedDoc.name = validator.escape(validatedDoc.name)
    validatedDoc.name = validator.blacklist(validatedDoc.name, '$')

    validatedDoc.username = validator.trim(req.body.username)
    validatedDoc.username = validator.escape(validatedDoc.username)
    validatedDoc.username = validator.blacklist(validatedDoc.username, '$')

    const new_doc = new Admin(validatedDoc)
    new_doc.save(function(err, doc) {
      if (err) {
        return next(err)
      } else {
        return res.status(201).send({success: true, data: doc})
      }
    })
  }
}

exports.delete_admin = function(req, res, next) {
  if (req.params.id === 'all') {
    Admin.remove({}, function(err, admin) {
      if (err) {
  			return next(err)
  		}
      res.json({ message: 'All Admins Successfully Deleted' })
    })
  } else if(validator.isEmpty(req.params.id)) {
    return next({name:'Missing'})
  }  else {
    Admin.remove({
      "username": req.params.id
    }, function(err, admin) {
      if (err) {
  			return next(err)
  		}
      res.json({ message: 'Admin successfully deleted' })
    })
  }
}
