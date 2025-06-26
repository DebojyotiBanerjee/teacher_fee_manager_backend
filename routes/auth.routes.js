const express = require("express");
const authController = require("../controller/auth.controller");
const {
  registerValidator,
  verifyOTPValidator,
  resendOTPValidator,
  loginValidator,
  forgotPasswordValidator,
  verifyResetOTPValidator,
  resendPasswordResetOTPValidator,
  resetPasswordValidator
} = require("../validators/auth.validators");

const router = express.Router();

// Register route (handles new registration and OTP resend)
router.post("/register", registerValidator, authController.register);

// Verify OTP route
router.post("/verify-otp", verifyOTPValidator, authController.verifyOTP);

// Resend OTP for registration verification
router.post("/resend-otp", resendOTPValidator, authController.resendOTP);

// Login route
router.post("/login", loginValidator, authController.login);

// Forgot password (request OTP)
router.post("/forgot-password", forgotPasswordValidator, authController.forgotPassword);

// Verify OTP for password reset
router.post("/verify-reset-otp", verifyResetOTPValidator, authController.verifyResetOTP);

// Resend OTP for password reset
router.post("/resend-password-otp", resendPasswordResetOTPValidator, authController.resendPasswordResetOTP);

// Reset password
router.post("/reset-password", resetPasswordValidator, authController.resetPassword);

module.exports = router;