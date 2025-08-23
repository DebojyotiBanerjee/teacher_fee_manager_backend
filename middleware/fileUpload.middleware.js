const { IncomingForm } = require('formidable');

// Create a single middleware that handles both file upload and validation
const createUploadMiddleware = (fieldName, options = {}) => {
    return (req, res, next) => {
        const form = new IncomingForm({
            maxFileSize: 20 * 1024 * 1024, // 20MB
            allowEmptyFiles: false,
            maxFiles: 1,
            multiples: false,
            filter: ({ mimetype }) => {
                return mimetype && ['image/jpeg', 'image/jpg', 'image/png'].includes(mimetype);
            },
            ...options
        });

        form.parse(req, (err, fields, files) => {
            if (err) {
                if (err.httpCode === 413) {
                    return res.status(400).json({
                        success: false,
                        message: 'File is too large. Maximum size is 20MB'
                    });
                }
                if (err.code === 1009) { // Formidable's error code for maxFiles exceeded
                    return res.status(400).json({
                        success: false,
                        message: 'Only one file can be uploaded at a time'
                    });
                }
                if (err.code === 1003) { // Formidable's error code for invalid file type
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid file type. Only JPEG, JPG and PNG files are allowed'
                    });
                }
                return res.status(500).json({
                    success: false,
                    message: 'Error processing file upload'
                });
            }

            // Check if the required file is present
            if (!files || !files[fieldName]) {
                return res.status(400).json({
                    success: false,
                    message: `${fieldName} is required`
                });
            }

            // Attach the parsed data to req
            req.fields = fields; // Keep form fields in req.fields
            req.files = {};
            
            // Handle the file object
            if (Array.isArray(files[fieldName])) {
                req.files[fieldName] = files[fieldName][0];
            } else {
                req.files[fieldName] = files[fieldName];
            }

            next();
        });
    };
};

// Export a factory function for each type of upload
module.exports = {
    uploadQRCode: (options = {}) => createUploadMiddleware('qrCode', options),
    uploadPaymentScreenshot: (options = {}) => createUploadMiddleware('screenshot', options)
};
