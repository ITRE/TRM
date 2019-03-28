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
    return next({name:'EmailError'})
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
    validatedDoc.name = validator.escape(validatedDoc.name)
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


    User.create(validatedDoc, function (err, doc) {
      if (err) {
        return next(err)
      } else {
        return res.status(201).send({success: true, data: doc})
      }
    })
	}
}

exports.list_users = function(req, res, next) {
  User.find({})
    .exec(function(err, doc) {
      if (err) {
        return next({name:'FindError'})
      }
      return res.status(200).send({success: true, data: doc})
  })
}

exports.update_user = function(req, res, next) {
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

  User.findOneAndUpdate({
    "email": req.params.id
  }, {$set: validatedDoc}, {new: true})
	.exec(function(err, user) {
		if (err) {
      return next({name:'UpdateError'})
		} else if (user === null) {
      return next({name:'FindError'})
		} else {
			return res.status(200).send({success: true, data: user})
		}
  })
}

exports.delete_user = function(req, res, next) {
  if (req.params.id === 'all') {
    User.remove({}, function(err, user) {
      if (err) {
  			return next(err)
  		}
      res.json({ message: 'All Users Successfully Deleted' })
    })
  } else {
    User.remove({
      "email": req.params.id
    }, function(err, user) {
      if (err) {
  			return next(err)
  		}
      res.json({ message: 'User successfully deleted' })
    })
  }
}

exports.view_user = function(req, res, next) {
  User.findOne({"email": req.params.id})
	.exec(function(err, user) {
		if (err) {
      return next({name:'FindError'})
		} else if (user === null) {
      return next({name:'FindError'})
		} else {
			return res.status(200).send({success: true, data: user})
		}
  })
}
