const { body } = require('express-validator');

const detailTeacherValidator = [
  body('qualifications')
    .isArray({ min: 1 }).withMessage('Qualifications must be a non-empty array'),
  body('qualifications.*.degree')
    .notEmpty().withMessage('Degree is required')
    .isString().withMessage('Degree must be a string'),
  body('qualifications.*.institution')
    .notEmpty().withMessage('Institution is required')
    .isString().withMessage('Institution must be a string'),
  body('qualifications.*.yearCompleted')
    .notEmpty().withMessage('Year completed is required')
    .isInt({ min: 1900, max: new Date().getFullYear() }).withMessage('Year completed must be a valid year'),
  body('experience.years')
    .optional().isNumeric().withMessage('Experience years must be a number'),
  body('experience.previousInstitutions')
    .optional().isArray().withMessage('Previous institutions must be an array'),
  body('bio')
    .optional().isString().isLength({ max: 500 }).withMessage('Bio must be a string up to 500 characters'),
  body('subjectsTaught')
    .isArray({ min: 1 }).withMessage('Subjects taught must be a non-empty array'),
  body('subjectsTaught.*')
    .notEmpty().withMessage('Each subject taught is required')
    .isString().withMessage('Subject taught must be a string'),
  // Optionally add more validations for availability, socialMedia, etc.
];

const batchValidator = [
  body('subject')
    .notEmpty().withMessage('Subject is required')
    .isString().withMessage('Subject must be a string'),
  body('batchName')
    .notEmpty().withMessage('Batch name is required')
    .isString().withMessage('Batch name must be a string'),
  body('startDate')
    .notEmpty().withMessage('Start date is required')
    .isISO8601().withMessage('Start date must be a valid date'),
  body('endDate')
    .notEmpty().withMessage('End date is required')
    .isISO8601().withMessage('End date must be a valid date'),
  body('time')
    .notEmpty().withMessage('Time is required')
    .isString().withMessage('Time must be a string'),
  body('maxStrength')
    .notEmpty().withMessage('Max strength is required')
    .isInt({ min: 1 }).withMessage('Max strength must be at least 1'),
  body('mode')
    .notEmpty().withMessage('Mode is required')
    .isIn(['online', 'offline', 'hybrid']).withMessage('Mode must be online, offline, or hybrid'),
  body('feePerStudent')
    .notEmpty().withMessage('Fee per student is required')
    .isFloat({ min: 0 }).withMessage('Fee per student must be a non-negative number'),
  body('location')
    .if(body('mode').not().equals('online'))
    .notEmpty().withMessage('Location is required for offline/hybrid mode')
    .isString().withMessage('Location must be a string'),
  body('daysOfWeek')
    .isArray({ min: 1 }).withMessage('Days of week must be a non-empty array'),
  body('daysOfWeek.*')
    .notEmpty().withMessage('Each day of week is required')
    .isString().withMessage('Day of week must be a string'),
  body('studentEligibilityCriteria')
    .optional().isString().withMessage('Eligibility criteria must be a string'),
  body('courseCategoryOrBoard')
    .optional().isString().withMessage('Course category/board must be a string'),
];

const attendanceViewValidator = [
  body('batchId')
    .optional()
    .isMongoId().withMessage('Batch ID must be a valid Mongo ID'),
  body('date')
    .optional()
    .isISO8601().withMessage('Date must be a valid date'),
];

module.exports = { detailTeacherValidator, batchValidator, attendanceViewValidator };