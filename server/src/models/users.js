const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const Schema = mongoose.Schema

const UserSchema = new Schema({
  username: {
    type: String,
    unique: true,
    Required: 'Please enter your Unity ID'
  },
  password: {
    type: String,
    Required: 'Please enter a memorable password'
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  role: {
    type: String,
    default: 'Staff'
  },
  email: String,
  phone: String,
  first: String,
  last: String
},


UserSchema.pre('save', function(next)  {
  let user = this
  bcrypt.genSalt(10, function(err, salt) {
    if (err) {
      error.name = 'PassHash'
      return next(err)
    } else {
      bcrypt.hash(user.password, salt, function(error, hash) {
        if (error) {
          error.name = 'PassHash'
          return next(error)
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
    error.name = 'PassHash'
    return next(error)
  }
}

UserSchema.pre("update", hashPassword)
UserSchema.pre("findOneAndUpdate", hashPassword)

UserSchema.methods.comparePassword = function (passw, cb) {
    bcrypt.compare(passw, this.password, function (err, isMatch) {
        if (err) { return cb(err) }
        cb(null, isMatch)
    })
}

UserSchema.index({ username: 1 }, { unique: true })

module.exports = mongoose.model('User', UserSchema)
