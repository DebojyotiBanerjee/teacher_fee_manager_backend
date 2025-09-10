const { body, param, query } = require('express-validator');

// Offline Payment Validators
const createOfflinePaymentValidator = [
  body('studentId')
    .notEmpty().withMessage('Student ID is required')
    .isMongoId().withMessage('Invalid student ID format'),
  body('courseId')
    .notEmpty().withMessage('Course ID is required')
    .isMongoId().withMessage('Invalid course ID format'),
  body('paymentDate')
    .notEmpty().withMessage('Payment date is required')
    .isISO8601().withMessage('Invalid date format'),
  body('notes')
    .optional()
    .isString().withMessage('Notes must be a string')
    .trim()
];

// QR code file validation middleware
const feeQRCodeValidator = (req, res, next) => {
  try {
    // Check if file exists in request
    if (!req.files ) {
      return res.status(400).json({
        success: false,
        message: 'QR code image is required'
      });
    }

    const file = req.files.qrCode;

    

    // Check file type - try both type and mimetype properties
    const fileType = file.type || file.mimetype;
    if (!fileType || !fileType.startsWith('image/')) {      
      return res.status(400).json({
        success: false,
        message: 'Only image files are allowed'
      });
    }

    // Check file size (max 20MB)
    const maxSize = 20 * 1024 * 1024; // 20MB in bytes
    if (file.size > maxSize) {
      return res.status(400).json({
        success: false,
        message: 'File size cannot exceed 20MB'
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error validating QR code file'
    });
  }
};

// Student payment screenshot validator
const paymentScreenshotValidator = (req, res, next) => {
  try {
    // Check if file exists in request
    if (!req.files || !req.files.screenshot) {
      return res.status(400).json({
        success: false,
        message: 'Payment screenshot is required'
      });
    }

    const file = req.files.screenshot;

    // Debug logging
    console.log('File object:', file);
    console.log('File type:', file.type);
    console.log('File mimetype:', file.mimetype);
    console.log('File name:', file.name);

    // Check file type - try both type and mimetype properties
    const fileType = file.type || file.mimetype;
    if (!fileType || !['image/png', 'image/jpeg', 'image/jpg'].includes(fileType)) {
      console.log('File validation failed - fileType:', fileType);
      return res.status(400).json({
        success: false,
        message: 'Only PNG or JPEG images are allowed'
      });
    }

    // Check file size (max 20MB)
    const maxSize = 20 * 1024 * 1024; // 20MB in bytes
    if (file.size > maxSize) {
      return res.status(400).json({
        success: false,
        message: 'File size cannot exceed 20MB'
      });
    }

    // Validate payment fields
    if (!req.fields.courseId) {
      return res.status(400).json({
        success: false,
        message: 'Course ID is required'
      });
    }

    if (!req.fields.transactionId) {
      return res.status(400).json({
        success: false,
        message: 'Transaction ID is required'
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error validating payment screenshot'
    });
  }
};

module.exports = { 
  createOfflinePaymentValidator,
  feeQRCodeValidator,
  paymentScreenshotValidator
};
