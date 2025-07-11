const mongoose = require('mongoose');
const { Schema } = mongoose;

const batchSchema = new Schema({
    teacher: {
         type: Schema.Types.ObjectId,
          ref: 'User',
           required: true
         },
    teacherDetailId: {
        type: Schema.Types.ObjectId,
        ref: 'DetailTeacher',
        required: true
    },
    students: [{
         type: mongoose.Schema.Types.ObjectId,
          ref: 'User' }],
    subject: {
        type: String,
        required: true,
        trim: true
    },
    batchName: {
        type: String,
        required: true,
        trim: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
    },
    time: {
        type: String, // e.g., "10:00 AM - 12:00 PM"
        required: true
    },
    maxStrength: {
        type: Number,
        required: true,
        min: 1
    },
    mode: {
        type: String,
        enum: ['online', 'offline', 'hybrid'],
        required: true
    },
    feePerStudent: {
        type: Number,
        required: true,
        min: 0
    },
    location: {
        type: String,
        required: function () { return this.mode !== 'online'; }, // Required if not online
        trim: true
    },
    daysOfWeek: {
        type: [String], // e.g., ['Monday', 'Wednesday', 'Friday']
        required: true
    },
    batchStatus: {
        type: String,
        enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
        default: 'upcoming'
    },
    requiresApproval: {
        type: Boolean,
        default: false
    },
    requiredLevel: {
        type: String,
        enum: ['primary', 'secondary', 'higher_secondary', 'undergraduate', 'postgraduate'],
        required: false
    },
    description: {
        type: String,
        trim: true
    },
    courseCategoryOrBoard: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

// Indexes for better query performance
batchSchema.index({ subject: 1 });
batchSchema.index({ 'schedule.startDate': 1 });
batchSchema.index({ status: 1 });
batchSchema.index({ averageRating: -1 });
batchSchema.index({ mode: 1 });
batchSchema.index({ requiresApproval: 1 });
batchSchema.index({ teacherDetailId: 1 });

module.exports = mongoose.model('Batch', batchSchema);
