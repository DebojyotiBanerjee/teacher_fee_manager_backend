const { body } = require('express-validator');

const detailTeacherValidator = [
  body('user')
    .notEmpty().withMessage('User is required')
    .isMongoId().withMessage('User must be a valid Mongo ID'),
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

module.exports = { detailTeacherValidator };