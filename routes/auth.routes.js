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

/**
 * @swagger
 * /register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullname:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               password:
 *                 type: string
 *               confirmPassword:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [teacher, student]
 *     responses:
 *       200:
 *         description: OTP sent to your email. Please verify to complete registration.
 */
router.post('/register', registerValidator, validator, authController.register);

/**
 * @swagger
 * /login:
 *   post:
 *     tags: [Auth]
 *     summary: User login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               login:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 */
router.post('/login', loginValidator, validator, authController.login);

/**
 * @swagger
 * /verify-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Verify OTP for registration
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               otp:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email verified successfully
 */
router.post('/verify-otp', verifyOTPValidator, validator, authController.verifyOTP);

/**
 * @swagger
 * /resend-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Resend OTP for registration
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: New OTP sent to your email
 */
router.post('/resend-otp', resendOTPValidator, validator, authController.resendOTP);

/**
 * @swagger
 * /forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request OTP for password reset
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset OTP sent to your email
 */
router.post('/forgot-password', forgotPasswordValidator, validator, authController.forgotPassword);

/**
 * @swagger
 * /verify-reset-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Verify OTP for password reset
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               otp:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP verified successfully
 */
router.post('/verify-reset-otp', verifyResetOTPValidator, validator, authController.verifyResetOTP);

/**
 * @swagger
 * /resend-password-reset-otp:
 *   post:
 *     tags: [Auth]
 *     summary: Resend OTP for password reset
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: New password reset OTP sent to your email
 */
router.post('/resend-password-reset-otp', resendPasswordResetOTPValidator, validator, authController.resendPasswordResetOTP);

/**
 * @swagger
 * /reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Reset password using OTP
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               otp:
 *                 type: string
 *               newPassword:
 *                 type: string
 *               confirmPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successfully
 */
router.post('/reset-password', resetPasswordValidator, validator, authController.resetPassword);

module.exports = router;