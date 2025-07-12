const { body } = require('express-validator');

// 1. View available batches (filtered)
const getAvailableBatchesValidator = [
  body('subject').optional().isString().withMessage('Subject must be a string'),
  body('status').optional().isString().withMessage('Status must be a string'),
  body('teacher').optional().isMongoId().withMessage('Teacher must be a valid Mongo ID'),
  body('teacherName').optional().isString().withMessage('Teacher name must be a string'),
  body('mode').optional().isIn(['online', 'offline', 'hybrid']).withMessage('Mode must be online, offline, or hybrid'),
  body('minFee').optional().isNumeric().withMessage('minFee must be a number'),
  body('maxFee').optional().isNumeric().withMessage('maxFee must be a number'),
];

// 2. Apply/Enroll in a batch
const applyToBatchValidator = [
  body('batchId').notEmpty().withMessage('Batch ID is required').isMongoId().withMessage('Batch ID must be a valid Mongo ID'),
];

// 3. Approve/Reject enrollment
const approveEnrollmentValidator = [
  body('studentId').notEmpty().withMessage('Student ID is required').isMongoId().withMessage('Student ID must be a valid Mongo ID'),
  body('batchId').notEmpty().withMessage('Batch ID is required').isMongoId().withMessage('Batch ID must be a valid Mongo ID'),
  body('action').notEmpty().withMessage('Action is required').isIn(['approve', 'reject']).withMessage('Action must be approve or reject'),
];

// 4. Update attendance
const updateAttendanceValidator = [
  body('studentId').notEmpty().withMessage('Student ID is required').isMongoId().withMessage('Student ID must be a valid Mongo ID'),
  body('batchId').notEmpty().withMessage('Batch ID is required').isMongoId().withMessage('Batch ID must be a valid Mongo ID'),
  body('isPresent').notEmpty().withMessage('isPresent is required').isBoolean().withMessage('isPresent must be a boolean'),
];

// 5. Mark fee as paid
const markFeePaidValidator = [
  body('studentId').notEmpty().withMessage('Student ID is required').isMongoId().withMessage('Student ID must be a valid Mongo ID'),
  body('batchId').notEmpty().withMessage('Batch ID is required').isMongoId().withMessage('Batch ID must be a valid Mongo ID'),
];

module.exports = {
  getAvailableBatchesValidator,
  applyToBatchValidator,
  approveEnrollmentValidator,
  updateAttendanceValidator,
  markFeePaidValidator,
}; 