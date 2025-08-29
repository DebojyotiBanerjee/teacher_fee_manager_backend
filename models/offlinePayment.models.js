const mongoose = require('mongoose');
const { Schema } = mongoose;

const offlinePaymentSchema = new Schema({
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
    ref: 'Batch'
  },
  paymentDate: {
    type: Date,
    required: true
  },
  paidAt: {
    type: Date,
    default: Date.now
  },
  paymentMethod: {
    type: String,
    default: 'cash'
  },
  nextDueDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['paid'],
    default: 'paid'
  },
  notes: {
    type: String
  },
  amount: {
    type: Number,
    required: true
  }
}, {
  timestamps: true
});

// Indexes
offlinePaymentSchema.index({ student: 1, course: 1 });
offlinePaymentSchema.index({ teacher: 1 });
offlinePaymentSchema.index({ paymentDate: 1 });

module.exports = mongoose.model('OfflinePayment', offlinePaymentSchema);
