const mongoose = require('mongoose');
const { Schema } = mongoose;

const batchEnrollmentSchema = new Schema({
  batch: {
    type: Schema.Types.ObjectId,
    ref: 'Batch',
    required: true
  },
  student: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  enrolledAt: {
    type: Date,
    default: Date.now
  }
});

batchEnrollmentSchema.index({ batch: 1, student: 1 }, { unique: true });

module.exports = mongoose.model('BatchEnrollment', batchEnrollmentSchema); 