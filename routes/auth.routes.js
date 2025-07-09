const express = require('express');
const router = express.Router();
const authController = require('../controller/auth.controller');
const {
  registerValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  verifyOTPValidator,
  resendOTPValidator,
  verifyResetOTPValidator,
  resendPasswordResetOTPValidator
} = require('../validators/auth.validators');
const validator = require('../middleware/validator.middleware');

// Register a new user
router.post('/register', registerValidator, validator, authController.register);

// Verify OTP for registration
router.post('/verify-otp', verifyOTPValidator, validator, authController.verifyOTP);

// User login
router.post('/login', loginValidator, validator, authController.login);

// Request OTP for password reset
router.post('/forgot-password', forgotPasswordValidator, validator, authController.forgotPassword);

// Verify OTP for password reset
router.post('/verify-reset-otp', verifyResetOTPValidator, validator, authController.verifyResetOTP);

// Reset password using OTP
router.post('/reset-password', resetPasswordValidator, validator, authController.resetPassword);

// Resend OTP for registration
router.post('/resend-otp', resendOTPValidator, validator, authController.resendOTP);

// Resend OTP for password reset
router.post('/resend-password-reset-otp', resendPasswordResetOTPValidator, validator, authController.resendPasswordResetOTP);

module.exports = router;
