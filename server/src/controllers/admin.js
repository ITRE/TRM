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

const validateAdmin = (info) => {
  if (info === null || !info) {
    return next({name:'Missing'})
  } else if(validator.isEmpty(info.username) || validator.isEmpty(info.name) || validator.isEmpty(info.email) || validator.isEmpty(info.password)) {
    return next({name:'Missing'})
  } else if(!validator.isEmail(info.email)) {
    return next({name:'EmailError'})
  } else {
    let validatedDoc = {
      username: '',
      name: '',
      email: '',
      password: info.password
    }

    validatedDoc.email = validator.normalizeEmail(info.email)
    validatedDoc.name = validator.trim(info.name)
    validatedDoc.name = validator.escape(validatedDoc.name)
    validatedDoc.name = validator.blacklist(validatedDoc.name, '$')

    validatedDoc.username = validator.trim(info.username)
    validatedDoc.username = validator.escape(validatedDoc.username)
    validatedDoc.username = validator.blacklist(validatedDoc.username, '$')

    return validatedDoc
  }
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
  let validatedAdmin = validateAdmin(req.body)
  const new_doc = new Admin(validatedAdmin)
  new_doc.save(function(err, doc) {
    if (err) {
      return next(err)
    } else {
      return res.status(201).send({success: true, data: doc})
    }
  })
}

exports.update_admin = function(req, res, next) {
  let validatedAdmin = validateAdmin(req.body)
  Admin.findOneAndUpdate({
    "username": req.params.id
  }, {$set: validatedAdmin}, {new: true})
	.exec(function(err, user) {
		if (err) {
      err.name = 'UpdateError'
			return next(err)
		} else if (user === null) {
      return next({name:'NoUser'})
		} else {
			return res.status(200).send({success: true, data: user})
		}
  })
}

exports.delete_admin = function(req, res, next) {
  if (req.params.id === 'all') {
    Admin.deleteMany({}, function(err, admin) {
      if (err) {
  			return next(err)
  		}
      res.json({ message: 'All Admins Successfully Deleted' })
    })
  } else if(validator.isEmpty(req.params.id)) {
    return next({name:'Missing'})
  }  else {
    Admin.deleteOne({
      "username": req.params.id
    }, function(err, admin) {
      if (err) {
  			return next(err)
  		}
      res.json({ message: 'Admin successfully deleted' })
    })
  }
}

exports.login_admin = function(req, res, next) {
  passport.authenticate('local', {session: false}, (err, user, info) => {
    if (err) {
      console.log('authentication error at login')
      return next(err)
    } else if (!user) {
      return next(info)
    } else {
      req.login(user, {session: false}, (err) => {
        if (err) {
          console.log('login error')
    			return next(err)
    		}
        let token = jwt.sign({
          username: req.user.username,
          name: req.user.name,
          email: req.user.email
        }, config.secret, {
          expiresIn: '1h'
        })
        return res.status(200).send({
          success: true,
          message: "Successfully logged in.",
          token: token,
          user:{
            name: req.user.name,
            email: req.user.email
          }
        })
      })
    }
  })(req, res, next)
}

exports.login_reset = function(req, res, next) {
  Admin.findOne({
    "email": req.body.email
  })
  .exec(function(err, user) {
    if (err) {
      err.name = 'UpdateError'
      return next(err)
    } else if (user === null) {
      return next({name:'NoUser', sent:req.body})
    } else if (req.body.token !== user.resetPasswordToken) {
      return next({name:'WrongToken', sent:req.body})
    } else {
      user.password = req.body.password
      user.resetPasswordToken = ''
      console.log(user)
      user.save(function(err, doc) {
        if (err) {
          return next(err)
        } else {
          return res.status(201).send({success: true, data: doc})
        }
      })
    }
  })
}
