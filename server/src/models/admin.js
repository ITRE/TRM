const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const Schema = mongoose.Schema

const AdminSchema = new Schema({
  username: {
    type: String,
    unique: true,
    Required: 'Please enter your username'
  },
  name: String,
  email: {
    type: String,
    unique: true,
    Required: 'Please enter your email address'
  },
  password: {
    type: String,
    Required: 'Please enter a memorable password'
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date
})

AdminSchema.pre('save', function(next)  {
  let user = this
  bcrypt.genSalt(10, function(err, salt) {
    if (err) {
      return next({name: 'PassHash', err: err})
    } else {
      bcrypt.hash(user.password, salt, function(error, hash) {
        if (error) {
          return next({name: 'PassHash', err: error})
        } else {
          user.password = hash
          next()
        }
      })
    }
  })
})

const hashPassword = function(next) {
  let password = this.getUpdate().$set.password
  if (!password) {
    return next()
  }
  try {
    const salt = bcrypt.genSaltSync()
    const hash = bcrypt.hashSync(password, salt)
    this.getUpdate().$set.password = hash
    console.log('Password Hashed')
    next()
  } catch (error) {
    return next({name: 'PassHash'})
  }
}

AdminSchema.pre("update", hashPassword)
AdminSchema.pre("findOneAndUpdate", hashPassword)

AdminSchema.methods.comparePassword = function (passw, cb) {
    bcrypt.compare(passw, this.password, function (err, isMatch) {
        if (err) { return cb(err) }
        cb(null, isMatch)
    })
}

AdminSchema.index({ username: 1 }, { unique: true })

module.exports = mongoose.model('Admin', AdminSchema)
