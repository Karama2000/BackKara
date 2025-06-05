// Routes/AuthRoutes/AuthRoute.js
const express = require('express');
const { register } = require('../../Controllers/AuthControllers/Register');
const { login } = require('../../Controllers/AuthControllers/Login');
const { resetPassword, resetPasswordConfirm } = require('../../Controllers/AuthControllers/MdpOublie');

const authRoute = express.Router();

authRoute.post('/register', register);
authRoute.post('/login', login);
authRoute.post('/reset-password', resetPassword);
authRoute.post('/reset-password-confirm', resetPasswordConfirm);


module.exports = authRoute;