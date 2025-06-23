const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true },
  marksObtained: { type: Number, required: true, min: 0 },
  maxMarks: { type: Number, required: true, min: 0 },
  grade: { type: String, required: true },
  attendance: { type: Number, required: true, min: 0, max: 100 }, // percentage
  remarks: { type: String }
});

const academicSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  semester: {
    type: String,
    required: true
  },
  academicYear: {
    type: String,
    required: true
  },
  subjects: [subjectSchema],
  percentage: {
    type: Number,
    min: 0,
    max: 100
  },
  remarks: {
    type: String
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

const Academic = mongoose.model('Academic', academicSchema);

module.exports = Academic;