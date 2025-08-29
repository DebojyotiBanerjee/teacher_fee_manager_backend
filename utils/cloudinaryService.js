const cloudinary = require('./cloudinaryUtils');

class CloudinaryService {
    static async uploadFile(file, options = {}) {
        try {
            if (!file || (!file.filepath && !file.path)) {
                throw new Error('No file provided or invalid file format');
            }

            const uploadOptions = {
                folder: options.folder || 'uploads',
                resource_type: 'auto',
                ...options
            };

            // Use filepath for Formidable v4+ or path for older versions
            const filePath = file.filepath || file.path;
            const result = await cloudinary.uploader.upload(filePath, uploadOptions);

            return {
                url: result.secure_url,
                public_id: result.public_id,
                resource_type: result.resource_type
            };
        } catch (error) {
            throw new Error(`Error uploading to Cloudinary: ${error.message}`);
        }
    }

    static async uploadQRCode(file) {
        if (!file) {
            throw new Error('QR code file is required');
        }

        return this.uploadFile(file, {
            folder: 'qr_codes',
            allowed_formats: ['png', 'jpg', 'jpeg'],
            transformation: [
                { quality: 'auto:best' },
                { fetch_format: 'auto' }
            ]
        });
    }

    static async uploadPaymentScreenshot(file) {
        if (!file) {
            throw new Error('Payment screenshot is required');
        }

        return this.uploadFile(file, {
            folder: 'payment_screenshots',
            allowed_formats: ['png', 'jpg', 'jpeg'],
            transformation: [
                { quality: 'auto:best' },
                { fetch_format: 'auto' }
            ]
        });
    }

    static async deleteFile(publicId) {
        try {
            if (!publicId) {
                throw new Error('No public ID provided');
            }
            
            const result = await cloudinary.uploader.destroy(publicId);
            return result;
        } catch (error) {
            throw new Error(`Error deleting from Cloudinary: ${error.message}`);
        }
    }
}

module.exports = CloudinaryService;
