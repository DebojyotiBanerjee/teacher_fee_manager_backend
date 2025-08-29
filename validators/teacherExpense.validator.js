const { body } = require('express-validator');

const teacherExpenseValidator = [
    body('amount')
        .notEmpty()
        .withMessage('Amount is required')
        .isFloat({ min: 0 })
        .withMessage('Amount must be a positive number'),
    
    body('description')
        .notEmpty()
        .withMessage('Description is required')
        .trim()
        .isLength({ min: 5, max: 200 })
        .withMessage('Description must be between 5 and 200 characters'),
    
    body('category')
        .notEmpty()
        .withMessage('Category is required')
        .isIn(['UTILITIES', 'EQUIPMENT', 'MATERIALS', 'SOFTWARE', 'OTHER'])
        .withMessage('Invalid category'),

    body('status')
        .notEmpty()
        .withMessage('Status is required')
        .isIn(['PENDING', 'APPROVED', 'REJECTED'])
        .withMessage('Invalid status'),
    
    body('date')
        .notEmpty()
        .isISO8601()
        .withMessage('Invalid date format'),
    
    body('notes')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Notes cannot exceed 500 characters')
];

module.exports = {
    teacherExpenseValidator
};
