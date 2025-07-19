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

courseApplicationSchema.index({ course: 1, student: 1 }, { unique: true });

module.exports = mongoose.model('CourseApplication', courseApplicationSchema); 