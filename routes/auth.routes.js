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
const { authenticate } = require('../middleware/auth.middleware');


router.post('/register', registerValidator, validator, authController.register);


router.post('/verify-otp', verifyOTPValidator, validator, authController.verifyOTP);


router.post('/login', loginValidator, validator, authController.login);


router.post('/forgot-password', forgotPasswordValidator, validator, authController.forgotPassword);


router.post('/verify-reset-otp', verifyResetOTPValidator, validator, authController.verifyResetOTP);


 
router.post('/reset-password', resetPasswordValidator, validator, authController.resetPassword);


 
router.post('/resend-otp', resendOTPValidator, validator, authController.resendOTP);


 
router.post('/resend-password-reset-otp', resendPasswordResetOTPValidator, validator, authController.resendPasswordResetOTP);

router.post('/logout', authController.logout);

// Get current user session
router.get('/me', authenticate(), authController.getCurrentUser);

// Refresh access and refresh tokens
router.post('/refresh-token', authController.refreshToken);

module.exports = router;