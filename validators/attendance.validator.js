const { body } = require('express-validator');

const Attendance = [
  body('batch')
    .notEmpty().withMessage('Batch is required')
    .isMongoId().withMessage('Batch must be a valid ID'),
  body('date')
    .notEmpty().withMessage('Date is required')
    .isISO8601().withMessage('Date must be a valid date'),
  body('attendance')
    .isArray({ min: 1 }).withMessage('Attendance must be a non-empty array'),
  body('attendance.*.student')
    .notEmpty().withMessage('Student is required')
    .isMongoId().withMessage('Student must be a valid ID'),
  body('attendance.*.status')
    .notEmpty().withMessage('Status is required')
    .isIn(['present', 'absent', 'late', 'excused']).withMessage('Status must be one of: present, absent, late, excused'),
  body('attendance.*.notes')
    .optional()
    .isString().withMessage('Notes must be a string')
    .isLength({ max: 100 }).withMessage('Notes cannot exceed 100 characters'),
];

module.exports = { Attendance }; 