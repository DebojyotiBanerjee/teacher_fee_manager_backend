const mongoose = require('mongoose');
const subjectSchema = require('./subject.models');

const academicSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: [true, 'Student reference is required'],
    index: true
  },
  semester: {
    type: String,
    required: [true, 'Semester is required'],
    trim: true
  },
  academicYear: {
    type: String,
    required: [true, 'Academic year is required'],
    match: [/^\d{4}-\d{4}$/, 'Academic year must be in format YYYY-YYYY']
  },
  subjects: [subjectSchema],
  cgpa: {
    type: Number,
    min: [0, 'CGPA cannot be negative'],
    max: [10, 'CGPA cannot exceed 10']
  },
  percentage: {
    type: Number,
    min: [0, 'Percentage cannot be negative'],
    max: [100, 'Percentage cannot exceed 100']
  },
  attendance: {
    overallPercentage: {
      type: Number,
      min: [0, 'Attendance cannot be negative'],
      max: [100, 'Attendance cannot exceed 100']
    },
    totalClasses: {
      type: Number,
      min: 0
    },
    classesAttended: {
      type: Number,
      min: 0,
      validate: {
        validator: function(v) {
          return v <= this.attendance.totalClasses;
        },
        message: 'Classes attended cannot exceed total classes'
      }
    }
  },
  status: {
    type: String,
    enum: ['Active', 'Completed', 'Withdrawn', 'Failed'],
    default: 'Active'
  },
  remarks: {
    type: String,
    trim: true,
    maxlength: [500, 'Remarks cannot exceed 500 characters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for calculating average marks
academicSchema.virtual('averageMarks').get(function() {
  if (!this.subjects || this.subjects.length === 0) return 0;
  const totalMarks = this.subjects.reduce((sum, subject) => sum + subject.marksObtained, 0);
  return totalMarks / this.subjects.length;
});

// Method to check semester completion status
academicSchema.methods.isComplete = function() {
  return this.subjects.every(subject => subject.status === 'Completed');
};

// Static method to get student's academic history
academicSchema.statics.getStudentAcademics = function(studentId) {
  return this.find({ student: studentId })
    .populate('student')
    .populate('subjects.teacher');
};

// Indexes for better query performance
academicSchema.index({ student: 1, academicYear: 1 });
academicSchema.index({ student: 1, semester: 1 });

const Academic = mongoose.model('Academic', academicSchema);

module.exports = Academic;