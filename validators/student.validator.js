const { body } = require('express-validator');

exports.DetailStudent = [
  body('education.currentLevel')
    .notEmpty().withMessage('Current education level is required')
    .isString().withMessage('Current level must be a string'),
  body('education.institution')
    .notEmpty().withMessage('Institution name is required')
    .isString().withMessage('Institution must be a string'),
  body('education.institution.grade')
    .optional().isString().withMessage('Grade must be a string'),
  body('education.institution.yearOfStudy')
    .optional().isInt({ min: 1900, max: new Date().getFullYear() }).withMessage('Please provide a valid year'),
  body('education.board')
    .optional().isString().withMessage('Board must be a string'),
  body('phone')
    .optional().isString().withMessage('Phone must be a string')
    .matches(/^[0-9]{10}$/).withMessage('Phone number must be 10 digits long')
    .isMobilePhone().withMessage('Valid phone number is required'),
  body('subjects')
    .isArray().withMessage('Subjects must be an array'),
  body('subjects.*.subject')
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
  body('subjects.*.proficiencyLevel')
    .optional().isIn(['beginner', 'intermediate', 'advanced']).withMessage('Proficiency must be either beginner, intermediate, or advanced'),
  body('subjects.*.targetScore')
    .optional().isNumeric().withMessage('Target score must be a number'),
  body('subjects.*.currentScore')
    .optional().isNumeric().withMessage('Current score must be a number'),
  // Guardian validation
  body('guardian.name')
    .notEmpty().withMessage('Guardian name is required')
    .isString().withMessage('Guardian name must be a string'),
  body('guardian.relation')
    .notEmpty().withMessage('Guardian relation is required')
    .isString().withMessage('Guardian relation must be a string'),
  body('guardian.phone')
    .notEmpty().withMessage('Guardian phone is required')
    .isString().withMessage('Guardian phone must be a string'),
  body('guardian.email')
    .optional().isEmail().withMessage('Guardian email must be a valid email'),
  body('guardian.occupation')
    .optional().isString().withMessage('Guardian occupation must be a string'),
  // Address validation (optional)
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
  body('dob')
    .optional().isISO8601().withMessage('Date of birth must be a valid date'),
  body('status')
    .optional().isIn(['active', 'inactive']).withMessage('Status must be either active or inactive'),
  body('location')
    .optional().isString().withMessage('Location must be a string'),
  // Enrolled batches validation (optional)
  body('enrolledBatches')
    .optional().isArray().withMessage('Enrolled batches must be an array'),
  body('enrolledBatches.*.batch')
    .optional().isMongoId().withMessage('Batch must be a valid Mongo ID'),
  body('enrolledBatches.*.enrollmentDate')
    .optional().isISO8601().withMessage('Enrollment date must be a valid date'),
  body('enrolledBatches.*.status')
    .optional().isIn(['active', 'completed', 'dropped']).withMessage('Enrollment status must be one of: active, completed, dropped'),
  body('enrolledBatches.*.attendance.present')
    .optional().isNumeric().withMessage('Attendance present must be a number'),
  body('enrolledBatches.*.attendance.total')
    .optional().isNumeric().withMessage('Attendance total must be a number'),
  // Assignment validation (optional)
  body('enrolledBatches.*.assignments')
    .optional().isArray().withMessage('Assignments must be an array'),
  body('enrolledBatches.*.assignments.*.title')
    .optional().isString().withMessage('Assignment title must be a string'),
  body('enrolledBatches.*.assignments.*.dueDate')
    .optional().isISO8601().withMessage('Assignment due date must be a valid date'),
  body('enrolledBatches.*.assignments.*.assignmentStatus')
    .optional().isIn(['pending', 'submitted', 'graded']).withMessage('Assignment status must be one of: pending, submitted, graded'),
  body('enrolledBatches.*.assignments.*.score')
    .optional().isNumeric().withMessage('Assignment score must be a number'),
  body('enrolledBatches.*.progress')
    .optional().isNumeric().withMessage('Progress must be a number'),
  body('enrolledBatches.*.feePaid')
    .optional().isBoolean().withMessage('Fee paid must be a boolean'),
  // Class preferences validation (optional)
  body('classPreferences.daysOfWeek')
    .optional().isArray().withMessage('Days of week must be an array'),
  body('classPreferences.daysOfWeek.*')
    .optional().isIn(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']).withMessage('Invalid day of week'),
  body('classPreferences.preferredTimeSlot')
    .optional().isIn(['Morning', 'Afternoon', 'Evening']).withMessage('Preferred time slot must be Morning, Afternoon, or Evening')
];