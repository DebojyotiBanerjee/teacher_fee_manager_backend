const { body } = require('express-validator');

// Only allow PNG or JPEG, and require a file
const feeQRCodeValidator = [
  body('qrCode')
    .custom((value, { req }) => {
      if (!req.file) {
        throw new Error('QR code image is required');
      }
      // Check mimetype (multer puts it on req.file)
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
      if (!allowedTypes.includes(req.file.mimetype)) {
        throw new Error('Only PNG or JPEG images are allowed');
      }
      return true;
    })
];

module.exports = { feeQRCodeValidator };
