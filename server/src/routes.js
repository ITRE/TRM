module.exports = function(app) {
  const mongoose = require('mongoose')
  const jwt = require('jsonwebtoken')
  const passport = require('passport')
  const cors = require('cors')

  const users = require('./controllers/user')
	const tickets = require('./controllers/tickets')
	const admin = require('./controllers/admin')
	const email = require('./controllers/email')

  app.route('/')
		.get(function(req, res) {
    	return res.status(200).send({status: "running"})
    })

  app.route('/users')
    .post(users.create_user)
    .get(users.list_users)

  app.route('/users/:id')
    .get(users.view_user)
    .put(users.update_user)
    .delete(users.delete_user)

  app.route('/tickets')
    .post(tickets.new_request)
    .get(tickets.list_tickets)

  app.route('/tickets/:id')
    .put(email.send_response, tickets.update_request)
//    .put(tickets.update_request)
    .get(tickets.get_ticket)

  app.route('/admin')
    .post(admin.create_admin)

  app.route('/admin/:id')
    .delete(admin.delete_admin)
    .get(tickets.list_admin_tickets)

  app.route('/messages')
    .put(email.send_response, tickets.update_request)

  app.route('/testing')
    .post(function(req, res, next) {
      console.log(req.body)
      req.body = 'whooo!'
      next()
    }, function(req, res, next) {
      console.log(req.body)
      res.send('booooy!')
    })

/* Error Handler */
  app.use(function (err, req, res, next) {
    console.log(err)

    switch (err.name) {
      case 'UpdateError':
        return res.status(409).send({
          success: false,
          error: err,
          msg: "An error occurred while attempting to update this resource. Please check than all fields have been filled and that the ObjectID is correct."
        })
        break;
      case 'EmailError':
        return res.status(409).send({
          success: false,
          error: err,
          msg: "The email provided for this user was not valid. Please check your spelling and try again."
        })
        break;
      case 'ResetNotValid':
        return res.status(409).send({
          success: false,
          error: err,
          msg: "Your password could not be updated. Please consult your administrator for more information on this error."
        })
        break;
      case 'Mail':
        return res.status(500).send({
          success: false,
          error: err,
          msg: "The server was unable to send an email to your address. Please consult your administrator for more information on this error."
        })
        break;
      case 'FindError':
        return res.status(404).send({
          success: false,
          error: err,
          msg: "This ID does not match any registered. Please double check the Json Web Token payload."
        })
        break;
      case 'WrongPass':
        return res.status(403).send({
          success: false,
          error: err,
          msg: "The password entered for this user is incorrect. Please check your spelling and try again."
        })
        break;
      case 'AuthError':
        return res.status(403).send({
          success: false,
          error: err,
          msg: "The credentials for this user were not accepted. Please check your spelling and try again."
        })
        break;
      case 'PassHash':
        return res.status(500).send({
          success: false,
          error: err,
          msg: "There was an error hashing the provided password."
        })
        break;
      case 'Missing':
        return res.status(400).send({
          success: false,
          error: err,
          msg: "This request was missing a parameter"
        })
        break;
      default:
        return res.status(500).send({
          success: false,
          error: err,
          msg: "Sorry, something's gone wrong. " + err
        })
    }
  })
}
