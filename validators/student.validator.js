const { body } = require('express-validator');

exports.detailStudentValidator = [
  body('education.currentLevel')
    .notEmpty().withMessage('Current education level is required')
    .isString().withMessage('Current level must be a string'),
  body('education.institution')
    .notEmpty().withMessage('Institution name is required')
    .isString().withMessage('Institution must be a string'),
  body('education.grade')
    .optional().isString().withMessage('Grade must be a string'),
  body('education.year')
    .optional().isInt({ min: 1900, max: new Date().getFullYear() }).withMessage('Please provide a valid year'),
  body('education.board')
    .optional().isString().withMessage('Board must be a string'),
  body('subjects')
    .isArray().withMessage('Subjects must be an array'),
  body('subjects.*.subject')
    .notEmpty().withMessage('Subject is required')
    .isMongoId().withMessage('Invalid subject ID'),
  body('subjects.*.proficiency')
    .optional().isIn(['Beginner', 'Intermediate', 'Advanced']).withMessage('Proficiency must be either Beginner, Intermediate, or Advanced'),
  body('subjects.*.scores')
    .optional().isArray().withMessage('Scores must be an array'),
  body('subjects.*.scores.*.type')
    .optional().isString().withMessage('Score type must be a string'),
  body('subjects.*.scores.*.value')
    .optional().isNumeric().withMessage('Score value must be a number')
];