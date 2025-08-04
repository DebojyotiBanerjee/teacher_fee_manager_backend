const mongoose = require('mongoose');
const { Schema } = mongoose;

const courseApplicationSchema = new Schema({
  course: {
    type: Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  student: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  appliedAt: {
    type: Date,
    default: Date.now
  }    
}, { timestamps: true });

// Virtual for enrollStudent
courseApplicationSchema.virtual('enrollStudent').get(function() {
  return {
    enrollmentId: this._id,
    courseId: this.course,
    studentId: this.student,
    appliedAt: this.appliedAt,
    enrollmentDate: this.createdAt,
    status: 'enrolled'
  };
});

// Ensure virtuals are included when converting to JSON
courseApplicationSchema.set('toJSON', { virtuals: true });
courseApplicationSchema.set('toObject', { virtuals: true });

courseApplicationSchema.index({ course: 1, student: 1 }, { unique: true });

module.exports = mongoose.model('CourseApplication', courseApplicationSchema); 