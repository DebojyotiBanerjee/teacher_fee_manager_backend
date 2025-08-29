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
  batch: {
    type: Schema.Types.ObjectId,
    ref: 'Batch',
  },
  screenshotUrl: {
    type: String,
    // Not required for offline payments
    required: false
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
  paymentMethod: {
    type: String,
    enum: ['qr_scan', 'cash', 'offline'],
    default: 'qr_scan'
  },
  isRecurring: {
    type: Boolean,
    default: true
  },
  transactionId: {
    type: String,
    // Not required for offline payments
    required: false
  }
}, {
  timestamps: true
});

// Index for efficient queries
paymentSchema.index({ student: 1, course: 1 });
paymentSchema.index({ nextDueDate: 1 });
paymentSchema.index({ status: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
