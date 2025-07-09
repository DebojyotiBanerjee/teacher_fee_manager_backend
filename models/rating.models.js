const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
    teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DetailTeacher'
    },
    batchName: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Batch'
    },
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DetailStudent',
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    comment: {
        type: String,
        trim: true,
        maxLength: 500
    },
    type: {
        type: String,
        enum: ['teacher', 'batch'],
        required: true
    }
}, {
    timestamps: true
});

// Ensure the correct ID is provided based on rating type
ratingSchema.pre('save', function(next) {
    switch(this.type) {
        case 'teacher':
            if (!this.teacherId) {
                return next(new Error('TeacherId is required for teacher ratings'));
            }
            break;
        case 'batch':
            if (!this.batchId) {
                return next(new Error('BatchId is required for batch ratings'));
            }
            break;
        default:
            return next(new Error('Invalid rating type'));
    }
    next();
});

module.exports = mongoose.model('Rating', ratingSchema);