const express = require('express');
const router = express.Router();
const authController = require('../controller/auth.controller');
const { registerValidator, loginValidator, forgotPasswordValidator, resetPasswordValidator } = require('../validators/auth.validators');
const validator = require('../middleware/validator.middleware');

// Register route
router.post('/register', registerValidator, validator, authController.register);

// Login route
router.post('/login', loginValidator, validator, authController.login);

// Forgot password route
router.post('/forgot-password', forgotPasswordValidator, validator, authController.forgotPassword);

// Reset password route
router.post('/reset-password', resetPasswordValidator, validator, authController.resetPassword);

// Add more auth-related routes as needed

module.exports = router;