const mongoose = require('mongoose');
const { Schema } = mongoose;

const attendanceSchema = new Schema({
    teacherDetailId: {
        type: Schema.Types.ObjectId,
        ref: 'DetailTeacher',
        required: true
    },
    batch: {
        type: Schema.Types.ObjectId,
        ref: 'Batch',
        required: true
    },
    course: {
        type: Schema.Types.ObjectId,
        ref: 'Course'
    },
    student: {
        type: Schema.Types.ObjectId,
        ref: 'DetailStudent',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['present', 'absent', 'late', 'excused'],
        required: true
    },
    notes: {
        type: String,
        trim: true,
        maxlength: 100
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Attendance', attendanceSchema); 