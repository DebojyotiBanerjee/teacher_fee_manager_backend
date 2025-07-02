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

// Register route
router.post('/register', registerValidator, validator, authController.register);

// Login route
router.post('/login', loginValidator, validator, authController.login);

// Verify OTP route
router.post('/verify-otp', verifyOTPValidator, validator, authController.verifyOTP);

// Resend OTP route
router.post('/resend-otp', resendOTPValidator, validator, authController.resendOTP);

// Forgot password route
router.post('/forgot-password', forgotPasswordValidator, validator, authController.forgotPassword);

// Verify OTP for password reset
router.post('/verify-reset-otp', verifyResetOTPValidator, validator, authController.verifyResetOTP);

// Resend password reset OTP
router.post('/resend-password-reset-otp', resendPasswordResetOTPValidator, validator, authController.resendPasswordResetOTP);

// Reset password route
router.post('/reset-password', resetPasswordValidator, validator, authController.resetPassword);

module.exports = router;