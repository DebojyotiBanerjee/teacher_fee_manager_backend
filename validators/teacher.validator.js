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
  body('experience.previousInstitutions')
    .optional().isArray().withMessage('Previous institutions must be an array'),
  body('experience.previousInstitutions.*')
    .optional().isString().withMessage('Each previous institution must be a string'),
  body('address')
    .optional().isObject().withMessage('Address must be an object'),
  body('address.street')
    .optional().isString().withMessage('Street must be a string'),
  body('address.city')
    .optional().isString().withMessage('City must be a string'),
  body('address.state')
    .optional().isString().withMessage('State must be a string'),
  body('address.pincode')
    .optional().isString().withMessage('Pincode must be a string'),
  body('address.country')
    .optional().isString().withMessage('Country must be a string'),
  body('subjectsTaught')
    .isArray({ min: 1 }).withMessage('Subjects taught must be a non-empty array'),
  body('subjectsTaught.*')
    .notEmpty().withMessage('Each subject taught is required')
    .isString().withMessage('Subject taught must be a string'),
  body('socialMedia')
    .optional().isObject().withMessage('Social media must be an object'),
  body('socialMedia.linkedIn')
    .optional().isString().withMessage('LinkedIn must be a string')
];

const batchValidator = [


  body('subject')
    .notEmpty().withMessage('Subject is required')
    .isString().withMessage('Subject must be a string')
  ,
  body('batchName')
    .notEmpty().withMessage('Batch name is required')
    .isString().withMessage('Batch name must be a string'),
  body('startDate')
    .notEmpty().withMessage('Start date is required')
    .isISO8601().withMessage('Start date must be a valid date'),

  body('time')
    .notEmpty().withMessage('Time is required')
    .isString().withMessage('Time must be a string'),
  body('maxStrength')
    .notEmpty().withMessage('Max strength is required')
    .isInt({ min: 1, max: 100 }).withMessage('Max strength must be between 1 and 100'),
  body('mode')
    .notEmpty().withMessage('Mode is required')
    .isIn(['online', 'offline', 'hybrid']).withMessage('Mode must be online, offline, or hybrid'),   
    
  body('daysOfWeek')
    .isArray({ min: 1 }).withMessage('Days of week must be a non-empty array'),
  body('daysOfWeek.*')
    .notEmpty().withMessage('Each day of week is required')
    .isString().withMessage('Day of week must be a string')
    .isIn(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']).withMessage('Day of week must be one of: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday'),  
  body('description')
    .optional().isString().withMessage('Description must be a string'),  
];

const attendanceViewValidator = [
  body('teacherDetailId')
    .optional()
    .isMongoId().withMessage('Teacher detail ID must be a valid Mongo ID'),
  body('student')
    .optional()
    .isMongoId().withMessage('Student must be a valid Mongo ID'),
  body('date')
    .optional()
    .isISO8601().withMessage('Date must be a valid date')
    .custom((value) => {
      if (value) {
        const attendanceDate = new Date(value);
        const today = new Date();
        today.setHours(23, 59, 59, 999); // End of today
        if (attendanceDate > today) {
          throw new Error('Attendance date cannot be in the future');
        }
      }
      return true;
    }),
  body('status')
    .optional()
    .isIn(['present', 'absent', 'late', 'excused']).withMessage('Status must be one of: present, absent, late, excused'),
  body('notes')
    .optional()
    .isString().withMessage('Notes must be a string')
    .isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters'),
];

module.exports = { detailTeacherValidator, batchValidator, attendanceViewValidator };