const mongoose = require('mongoose');
const { Schema } = mongoose;

const detailStudentSchema = new Schema({
    gender: {
        type: String,
        enum: ['male', 'female', 'other', 'prefer_not_to_say'],
        required: true
    },
    education: {
        currentLevel: {
            type: String,
            required: true,
            trim: true
        },
        institution: {
            type: String,
            required: true,
            trim: true
        },
        grade: {
            type: String,
            required: true,
            trim: true
        },
        yearOfStudy: {
            type: Number,
            required: true
        },
        board: {
            type: String,
            trim: true
        }
    },
    guardian: {
        name: {
            type: String,
            required: true
        },
        relation: {
            type: String,
            required: true
        },
        phone: {
            type: String,
            required: true,
            trim: true
        },
        email: {
            type: String,
            required: true,
            trim: true
        },
        occupation: {
            type: String,
            required: true,
            trim: true
        }
    },
    address: {
        street: String,
        city: String,
        state: String,
        pincode: String,
        country: String
    },
    dob: {
        type: Date
    }


}, {
    timestamps: true
});

// Indexes for better query performance
detailStudentSchema.index({ 'enrolledBatches.batch': 1 });
detailStudentSchema.index({ isProfileComplete: 1 });
detailStudentSchema.index({ 'education.currentLevel': 1 });

// Virtual for phone number from user model
detailStudentSchema.virtual('phone').get(function () {
    return this.user ? this.user.phone : undefined;
});

// Ensure virtual fields are included when converting to JSON
detailStudentSchema.set('toJSON', { virtuals: true });
detailStudentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('DetailStudent', detailStudentSchema);
