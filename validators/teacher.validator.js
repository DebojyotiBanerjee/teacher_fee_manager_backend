const { body } = require('express-validator');

exports.detailTeacherValidator = [
  body('user').notEmpty().withMessage('User is required'),
  body('qualifications').isArray().withMessage('Qualifications must be an array'),
  body('experience.years').optional().isNumeric(),
  body('bio').optional().isString().isLength({ max: 500 }),
  body('subjectsTaught').isArray().withMessage('Subjects taught must be an array'),
  // Add more field validations as needed
];