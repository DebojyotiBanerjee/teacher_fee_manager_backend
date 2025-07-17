const mongoose = require('mongoose');
const { Schema } = mongoose;

const batchSchema = new Schema({

    subject: {
        type: [String],
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
    time: {
        type: String, 
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
    daysOfWeek: {
        type: [String], 
        required: true
    },
    description: {
        type: String,
        trim: true,
        maxlength: 100
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
