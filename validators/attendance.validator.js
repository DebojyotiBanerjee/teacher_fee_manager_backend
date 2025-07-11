const { body } = require('express-validator');

const Attendance = [
  body('studentId')
    .notEmpty().withMessage('Student ID is required')
    .isMongoId().withMessage('Student ID must be a valid Mongo ID'),
  body('date')
    .notEmpty().withMessage('Date is required')
    .isISO8601().withMessage('Date must be a valid date'),
  body('status')
    .notEmpty().withMessage('Status is required')
    .isIn(['present', 'absent', 'late', 'excused']).withMessage('Status must be one of: present, absent, late, excused'),
  body('notes')
    .optional().isString().withMessage('Notes must be a string')
    .isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters')
];

const getTeacherAttendanceValidator = [
  body('date')
    .optional().isISO8601().withMessage('Date must be a valid date')
];

const getStudentAttendanceValidator = [
  body('studentId')
    .notEmpty().withMessage('Student ID is required')
    .isMongoId().withMessage('Student ID must be a valid Mongo ID')
];

module.exports = { 
  Attendance, 
  getTeacherAttendanceValidator, 
  getStudentAttendanceValidator 
}; 