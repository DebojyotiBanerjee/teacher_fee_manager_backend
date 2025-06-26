const express = require("express");
const { body } = require("express-validator");
const authController = require("../controller/auth.controller");

const router = express.Router();

// Register route (handles new registration and OTP resend)
router.post(
  "/register",
  [
    body("fullname").notEmpty().withMessage("Full name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("phone").isMobilePhone().withMessage("Valid phone number is required"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
    body("confirmPassword")
      .custom((value, { req }) => value === req.body.password)
      .withMessage("Passwords do not match"),
    body("role")
      .isIn(["teacher", "student"])
      .withMessage("Role must be teacher or student"),
  ],
  authController.register
);

// Verify OTP route
router.post(
  "/verify-otp",
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("otp").notEmpty().withMessage("OTP is required"),
  ],
  authController.verifyOTP
);

// Resend OTP for registration verification
router.post(
  "/resend-otp",
  [body("email").isEmail().withMessage("Valid email is required")],
  authController.resendOTP
);


// Login route
router.post(
  "/login",
  [
    body("user") //as a single field for email, phone, or full name
      .notEmpty()
      .withMessage("Email, phone, or full name is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  authController.login
);

// Forgot password (request OTP)
router.post(
  "/forgot-password",
  [body("email").isEmail().withMessage("Valid email is required")],
  authController.forgotPassword
);

// Verify OTP for password reset
router.post(
  "/verify-reset-otp",
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("otp").notEmpty().withMessage("OTP is required"),
  ],
  authController.verifyResetOTP
);

// Resend OTP for password reset
router.post(
  "/resend-password-otp",
  [body("email").isEmail().withMessage("Valid email is required")],
  authController.resendPasswordResetOTP
);

// Reset password
router.post(
  "/reset-password",
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("otp").notEmpty().withMessage("OTP is required"),
    body("newPassword")
      .isLength({ min: 6 })
      .withMessage("New password must be at least 6 characters"),
    body("confirmPassword")
      .custom((value, { req }) => value === req.body.newPassword)
      .withMessage("Passwords do not match"),
  ],
  authController.resetPassword
);

module.exports = router;
