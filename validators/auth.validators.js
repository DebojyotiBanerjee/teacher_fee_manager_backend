const { body } = require('express-validator');

exports.registerValidator = [
  body('fullname')
    .notEmpty().withMessage('Full name is required')
    .isLength({ max: 100 }).withMessage('Full name cannot exceed 100 characters'),
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Valid email is required')
    .matches(/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/).withMessage('Please enter a valid email address'),
  body('phone')
    .notEmpty().withMessage('Phone number is required')
    .matches(/^\+91[0-9]{10}$/).withMessage('Phone number must be in the format +91XXXXXXXXXX')
    .isMobilePhone('en-IN').withMessage('Valid phone number is required'),
  body('password')
    .notEmpty().withMessage('Password is required')    
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$])[A-Za-z\d!@#$]{8,}$/).withMessage('Password must be at least 8 characters long and can include one capital letters, numbers, and special characters (!@#$%^&*)'),
  body('confirmPassword')
    .notEmpty().withMessage('Confirm password is required')
    .custom((value, { req }) => value === req.body.password).withMessage('Passwords do not match'),
  body('role')
    .notEmpty().withMessage('Role is required')
    .isIn(['teacher', 'student']).withMessage('Role must be teacher or student'),
];

exports.verifyOTPValidator = [
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Valid email is required'),
  body('otp')
    .notEmpty().withMessage('OTP is required')
    .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
    .isNumeric().withMessage('OTP must contain only numbers'),
];

exports.resendOTPValidator = [
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Valid email is required'),
];

exports.loginValidator = [
  body('login')
    .notEmpty().withMessage('Login (email) is required')
    .isEmail().withMessage('Valid email is required'),
  body('password')
    .notEmpty().withMessage('Password is required')
];

exports.forgotPasswordValidator = [
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Valid email is required'),
];

exports.verifyResetOTPValidator = [
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Valid email is required'),
  body('otp')
    .notEmpty().withMessage('OTP is required')
    .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
    .isNumeric().withMessage('OTP must contain only numbers'),
];

exports.resendPasswordResetOTPValidator = [
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Valid email is required'),
];

exports.resetPasswordValidator = [
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Valid email is required'),
  body('otp')
    .notEmpty().withMessage('OTP is required')
    .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
    .isNumeric().withMessage('OTP must contain only numbers'),
  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
    .matches(/^[a-zA-Z0-9!@#$%^&*]{6,}$/).withMessage('Password must contain only alphanumeric and special characters'),
  body('confirmPassword')
    .notEmpty().withMessage('Confirm password is required')
    .custom((value, { req }) => value === req.body.newPassword).withMessage('Passwords do not match'),
];