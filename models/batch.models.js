const mongoose = require('mongoose');
const { Schema } = mongoose;

const batchSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    teacher: {
        type: Schema.Types.ObjectId,
        ref: 'DetailTeacher',
        required: true
    },
    subject: {
        type: String,
        required: true
    },
    schedule: {
        startDate: {
            type: Date,
            required: true
        },
        endDate: {
            type: Date,
            required: true
        },
        time: {
            start: String,
            end: String
        },
        days: [{
            type: String,
            enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        }]
    },
    students: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    maxStudents: {
        type: Number,
        required: true
    },
    fee: {
        type: Number,
        required: true
    },
    ratings: [{
        type: Schema.Types.ObjectId,
        ref: 'Rating'
    }],
    averageRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    totalRatings: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
        default: 'upcoming'
    },
    description: {
        type: String,
        maxlength: 1000
    }
}, {
    timestamps: true
});

// Indexes for better query performance
batchSchema.index({ subject: 1 });
batchSchema.index({ 'schedule.startDate': 1 });
batchSchema.index({ status: 1 });
batchSchema.index({ averageRating: -1 });

module.exports = mongoose.model('Batch', batchSchema);