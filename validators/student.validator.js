const { body } = require('express-validator');

const DetailStudent = [
  body('gender')
    .notEmpty().withMessage('Gender is required')
    .isString().withMessage('Gender must be a string')
    .isIn(['male', 'female', 'other', 'prefer_not_to_say']).withMessage('Gender must be one of: male, female, other, prefer_not_to_say'),
  body('education.currentLevel')
    .notEmpty().withMessage('Current education level is required')
    .isString().withMessage('Current level must be a string'),
  body('education.institution')
    .notEmpty().withMessage('Institution name is required')
    .isString().withMessage('Institution must be a string'),
  body('education.grade')
    .notEmpty().withMessage('Grade is required')
    .isString().withMessage('Grade must be a string'),
  body('education.yearOfStudy')
    .notEmpty().withMessage('Year of study is required')
    .isInt({ min: 1900, max: new Date().getFullYear() }).withMessage('Please provide a valid year'),
  body('education.board')
    .optional().isString().withMessage('Board must be a string'),
  body('phone')
    .optional().isString().withMessage('Phone must be a string')
    .matches(/^[0-9]{10}$/).withMessage('Phone number must be 10 digits long')
    .isMobilePhone().withMessage('Valid phone number is required'),   
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
  // Date of birth validation (optional)
  body('dob')
    .optional().isISO8601().withMessage('Date of birth must be a valid date'),  
];

module.exports = { DetailStudent };