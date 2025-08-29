const mongoose = require('mongoose');

const teacherExpenseSchema = new mongoose.Schema({
    teacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        required: true,
        enum: ['UTILITIES', 'EQUIPMENT', 'MATERIALS', 'SOFTWARE', 'OTHER'],
        uppercase: true
    },
    date: {
        type: Date,
        required: true,
        default: Date.now
    },    
    status: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED'],
        default: 'PENDING',
        uppercase: true,
        required: true
    },
    notes: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

// Add indexes for common queries
teacherExpenseSchema.index({ teacher: 1, date: -1 });
teacherExpenseSchema.index({ status: 1 });

const TeacherExpense = mongoose.model('TeacherExpense', teacherExpenseSchema);
module.exports = TeacherExpense;
