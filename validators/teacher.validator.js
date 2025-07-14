const { body } = require('express-validator');

const detailTeacherValidator = [
  body('phone')
    .optional().isString().withMessage('Phone must be a string')
    .matches(/^[0-9]{10}$/).withMessage('Phone number must be 10 digits long')
    .isMobilePhone().withMessage('Valid phone number is required'),
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
  body('experience.previousInstitutions.*')
    .optional().isString().withMessage('Each previous institution must be a string'),
  body('bio')
    .optional().isString().isLength({ max: 500 }).withMessage('Bio must be a string up to 500 characters'),
  body('subjectsTaught')
    .isArray({ min: 1 }).withMessage('Subjects taught must be a non-empty array'),
  body('subjectsTaught.*')
    .notEmpty().withMessage('Each subject taught is required')
    .isString().withMessage('Subject taught must be a string'),
  // Availability validation (optional, basic structure)
  body('availability')
    .optional().isObject().withMessage('Availability must be an object'),
  body('availability.monday')
    .optional().isArray().withMessage('Monday availability must be an array'),
  body('availability.tuesday')
    .optional().isArray().withMessage('Tuesday availability must be an array'),
  body('availability.wednesday')
    .optional().isArray().withMessage('Wednesday availability must be an array'),
  body('availability.thursday')
    .optional().isArray().withMessage('Thursday availability must be an array'),
  body('availability.friday')
    .optional().isArray().withMessage('Friday availability must be an array'),
  body('availability.saturday')
    .optional().isArray().withMessage('Saturday availability must be an array'),
  body('availability.sunday')
    .optional().isArray().withMessage('Sunday availability must be an array'),
  // Availability time slots validation
  body('availability.*.*.start')
    .optional().isString().withMessage('Start time must be a string'),  
  // Social media validation (optional, only LinkedIn present in schema)
  body('socialMedia')
    .optional().isObject().withMessage('Social media must be an object'),
  body('socialMedia.linkedIn')
    .optional().isString().withMessage('LinkedIn must be a string'),
  // Rating validation (optional)
  body('averageRating')
    .optional().isNumeric().withMessage('Average rating must be a number'),
  body('totalRatings')
    .optional().isNumeric().withMessage('Total ratings must be a number'),
  body('isProfileComplete')
    .optional().isBoolean().withMessage('Profile complete status must be a boolean'),
  // Batches validation (optional)
  body('batches')
    .optional().isArray().withMessage('Batches must be an array'),
  body('batches.*')
    .optional().isMongoId().withMessage('Each batch must be a valid Mongo ID'),
  // Ratings validation (optional)
  body('ratings')
    .optional().isArray().withMessage('Ratings must be an array'),
  body('ratings.*')
    .optional().isMongoId().withMessage('Each rating must be a valid Mongo ID'),
];

const batchValidator = [  
  body('teacherFullName')
    .notEmpty().withMessage('Teacher full name is required')
    .isMongoId().withMessage('Teacher full name must be a valid Mongo ID'),
  body('teacherDetailId')
    .notEmpty().withMessage('Teacher detail ID is required')
    .isMongoId().withMessage('Teacher detail ID must be a valid Mongo ID'),
  body('students')
    .optional().isArray().withMessage('Students must be an array'),
  body('students.*')
    .optional().isMongoId().withMessage('Each student must be a valid Mongo ID'),
  body('subject')
    .notEmpty().withMessage('Subject is required')
    .isString().withMessage('Subject must be a string')
    .isIn([
      'Mathematics',
      'Physics',
      'Chemistry',
      'Biology',
      'English',
      'Hindi',
      'History',
      'Geography',
      'Economics',
      'Computer Science',
      'Literature',
      'Political Science',
      'Sociology',
      'Psychology',
      'Art',
      'Music',
      'Physical Education',
      'Environmental Science',
      'Business Studies',
      'Accountancy',
      'Statistics',
      'Philosophy',
      'Religious Studies',
      'Foreign Languages',
      'Other'
    ]).withMessage('Invalid subject'),
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
  body('feePerStudent')
    .notEmpty().withMessage('Fee per student is required')
    .isFloat({ min: 0, max: 100000 }).withMessage('Fee per student must be between 0 and 100000'),
  body('location')
    .if(body('mode').not().equals('online'))
    .notEmpty().withMessage('Location is required for offline/hybrid mode')
    .isString().withMessage('Location must be a string'),
  body('daysOfWeek')
    .isArray({ min: 1 }).withMessage('Days of week must be a non-empty array'),
  body('daysOfWeek.*')
    .notEmpty().withMessage('Each day of week is required')
    .isString().withMessage('Day of week must be a string')
    .isIn(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']).withMessage('Day of week must be one of: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday'),
  body('batchStatus')
    .optional().isIn(['upcoming', 'ongoing', 'completed', 'cancelled']).withMessage('Batch status must be one of: upcoming, ongoing, completed, cancelled'),
  body('requiresApproval')
    .optional().isBoolean().withMessage('Requires approval must be a boolean'),
  body('requiredLevel')
    .notEmpty().withMessage('Required level is required')
    .isIn(['primary', 'secondary', 'higher_secondary', 'undergraduate', 'postgraduate']).withMessage('Required level must be one of: primary, secondary, higher_secondary, undergraduate, postgraduate'),
  body('description')
    .optional().isString().withMessage('Description must be a string'),
  body('board')
    .notEmpty().withMessage('Board is required')
    .isString().withMessage('Board must be a string')
    .isIn(['CBSE', 'ICSE', 'State Board', 'IB', 'Other']).withMessage('Board must be one of: CBSE, ICSE, State Board, IB, Other'),
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