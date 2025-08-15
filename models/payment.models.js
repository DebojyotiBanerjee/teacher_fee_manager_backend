const mongoose = require('mongoose');
const { Schema } = mongoose;

const paymentSchema = new Schema({
  student: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  teacher: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  course: {
    type: Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  screenshotUrl: {
    type: String,
    required: true
  },
  paidAt: {
    type: Date,
    default: Date.now
  },
  nextDueDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['paid', 'pending', 'overdue'],
    default: 'paid'
  },
  amount: {
    type: Number,
    default: 0
  },
  paymentMethod: {
    type: String,
    default: 'qr_scan'
  },
  isRecurring: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
paymentSchema.index({ student: 1, course: 1 });
paymentSchema.index({ nextDueDate: 1 });
paymentSchema.index({ status: 1 });

module.exports = mongoose.model('Payment', paymentSchema);