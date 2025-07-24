const { body } = require('express-validator');

const detailTeacherValidator = [ 
  body('gender')
    .notEmpty().withMessage('Gender is required')
    .isString().withMessage('Gender must be a string')
    .isIn(['male', 'female', 'other', 'prefer_not_to_say']).withMessage('Gender must be one of: male, female, other, prefer_not_to_say'), 
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
  body('profilePic')
    .optional()
    .isString().withMessage('Profile picture must be a string')
    .isURL().withMessage('Profile picture must be a valid URL'),
  body('subjectsTaught')
    .isArray({ min: 1 }).withMessage('Subjects taught must be a non-empty array'),
  body('subjectsTaught.*')
    .notEmpty().withMessage('Each subject taught is required')
    .isString().withMessage('Subject taught must be a string'),
  body('socialMedia')
    .optional().isObject().withMessage('Social media must be an object'),
  body('socialMedia.linkedIn')
    .optional().isString().withMessage('LinkedIn must be a string'),
  body('user')
    .notEmpty().withMessage('User is required')
    .isMongoId().withMessage('User must be a valid Mongo ID'),
];

const batchValidator = [
  body('course')
    .notEmpty().withMessage('Course is required')
    .isMongoId().withMessage('Course must be a valid ID'),
  body('batchName')
    .notEmpty().withMessage('Batch name is required')
    .isString().withMessage('Batch name must be a string')
    .isLength({ max: 100 }).withMessage('Batch name cannot exceed 100 characters'),
  body('startDate')
    .notEmpty().withMessage('Start date is required')
    .isISO8601().withMessage('Start date must be a valid date'),
  body('days')
    .isArray({ min: 1 }).withMessage('Days must be a non-empty array')
    .custom((value) => {
      const validDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      return value.every(day => validDays.includes(day));
    }).withMessage('Days must be one of: Mon, Tue, Wed, Thu, Fri, Sat, Sun'),
  body('time')
    .notEmpty().withMessage('Time is required')
    .isString().withMessage('Time must be a string'),
  body('mode')
    .notEmpty().withMessage('Mode is required')
    .isIn(['online', 'offline', 'hybrid']).withMessage('Mode must be online, offline, or hybrid'),
  body('maxStrength')
    .notEmpty().withMessage('Max strength is required')
    .isInt({ min: 1, max: 100 }).withMessage('Max strength must be between 1 and 100'),
  body('description')
    .notEmpty().withMessage('Description is required')
    .isString().withMessage('Description must be a string')
    .isLength({ max: 150 }).withMessage('Description cannot exceed 150 characters'),
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

// Course Validator
const CourseValidator = [
  body('title')
    .notEmpty().withMessage('Title is required')
    .isString().withMessage('Title must be a string'),
  body('subtitle')
    .optional()
    .isString().withMessage('Subtitle must be a string')
    .isLength({ max: 150 }).withMessage('Subtitle must be at most 150 characters'),
  body('description')
    .notEmpty().withMessage('Description is required')
    .isString().withMessage('Description must be a string')
    .isLength({ max: 500 }).withMessage('Description must be at most 500 characters'),
  body('prerequisites')
    .optional()
    .isString().withMessage('Prerequisites must be a string'),
  body('fee')
    .notEmpty().withMessage('Fee is required')
    .isNumeric().withMessage('Fee must be a number')
    .custom(fee => fee >= 0).withMessage('Fee must be non-negative'),
  body('duration')
    .notEmpty().withMessage('Duration is required')
    .isString().withMessage('Duration must be a string'),
  body('syllabus')
    .isArray({ min: 1 }).withMessage('Syllabus must be a non-empty array of strings'),
  body('syllabus.*')
    .notEmpty().withMessage('Each syllabus item is required')
    .isString().withMessage('Each syllabus item must be a string'),
];

module.exports = { detailTeacherValidator, batchValidator, attendanceViewValidator, CourseValidator };