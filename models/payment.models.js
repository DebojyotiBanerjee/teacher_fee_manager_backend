const mongoose = require('mongoose');
const {processPaymentDetails} = require('../middleware/payment.middleware');


const paymentSchema = new mongoose.Schema({
  // Payment Identification
  paymentId: {
    type: String,
    required: [true, 'Payment ID is required'],
    unique: true,
    uppercase: true
  },
  transactionId: {
    type: String,
    unique: true,
    sparse: true // Allows multiple null values but ensures uniqueness when present
  },
  
  // Related Documents
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: [true, 'Student reference is required']
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: [true, 'Teacher reference is required']
  },
  
  // Payment Details
  amount: {
    type: Number,
    required: [true, 'Payment amount is required'],
    min: [0, 'Payment amount cannot be negative']
  },
  currency: {
    type: String,
    default: 'INR',
    enum: ['INR', 'USD', 'EUR']
  },
  
  // Fee Breakdown
  feeBreakdown: {
    monthlyFee: {
      type: Number,
      default: 0,
      min: 0
    },
    admissionFee: {
      type: Number,
      default: 0,
      min: 0
    },
    examFee: {
      type: Number,
      default: 0,
      min: 0
    },
    libraryFee: {
      type: Number,
      default: 0,
      min: 0
    },
    labFee: {
      type: Number,
      default: 0,
      min: 0
    },
    lateFee: {
      type: Number,
      default: 0,
      min: 0
    },
    discount: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  
  // Payment Period
  paymentFor: {
    month: {
      type: String,
      required: [true, 'Payment month is required'],
      enum: ['January', 'February', 'March', 'April', 'May', 'June', 
             'July', 'August', 'September', 'October', 'November', 'December']
    },
    year: {
      type: Number,
      required: [true, 'Payment year is required'],
      min: [2020, 'Year cannot be before 2020'],
      max: [new Date().getFullYear() + 1, 'Year cannot be more than next year']
    }
  },
  
  // Payment Method
  paymentMethod: {
    type: String,
    required: [true, 'Payment method is required'],
    enum: ['Cash', 'Credit Card', 'Debit Card', 'Net Banking', 'UPI', 'Check', 'Bank Transfer']
  },
  
  // Payment Status
  paymentStatus: {
    type: String,
    required: [true, 'Payment status is required'],
    enum: ['Pending', 'Completed', 'Failed', 'Refunded', 'Partially Paid'],
    default: 'Pending'
  },
  
  // Dates
  dueDate: {
    type: Date,
    required: [true, 'Due date is required']
  },
  paidDate: {
    type: Date,
    default: null
  },
  
  // Additional Information
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  remarks: {
    type: String,
    trim: true,
    maxlength: [300, 'Remarks cannot exceed 300 characters']
  },
  
  // Receipt Information
  receiptNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  receiptIssued: {
    type: Boolean,
    default: false
  },
  
  // Payment Gateway Information (if applicable)
  gatewayResponse: {
    gatewayName: String,
    gatewayTransactionId: String,
    gatewayStatus: String,
    gatewayMessage: String
  },
  
  // Late Payment Information
  isLatePayment: {
    type: Boolean,
    default: false
  },
  daysLate: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Refund Information
  refundInfo: {
    isRefunded: {
      type: Boolean,
      default: false
    },
    refundAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    refundDate: Date,
    refundReason: String
  },
  
  // Installment Information
  installmentInfo: {
    isInstallment: {
      type: Boolean,
      default: false
    },
    installmentNumber: {
      type: Number,
      min: 1
    },
    totalInstallments: {
      type: Number,
      min: 1
    }
  },
  
  // Academic Year
  academicYear: {
    type: String,
    required: [true, 'Academic year is required'],
    match: [/^\d{4}-\d{4}$/, 'Academic year must be in format YYYY-YYYY (e.g., 2023-2024)']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for payment delay calculation
paymentSchema.virtual('paymentDelay').get(function() {
  if (this.paidDate && this.dueDate) {
    const diffTime = this.paidDate - this.dueDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }
  return 0;
});

// Virtual for total amount calculation
paymentSchema.virtual('calculatedAmount').get(function() {
  const breakdown = this.feeBreakdown;
  return breakdown.monthlyFee + breakdown.admissionFee + breakdown.examFee + 
         breakdown.libraryFee + breakdown.labFee + breakdown.lateFee - breakdown.discount;
});

// Pre-save middleware to generate payment ID
paymentSchema.pre('save', processPaymentDetails)
  
 

// Static method to get payments by student
paymentSchema.statics.getStudentPayments = function(studentId) {
  return this.find({ student: studentId }).populate('student teacher');
};

// Static method to get monthly revenue
paymentSchema.statics.getMonthlyRevenue = function(month, year) {
  return this.aggregate([
    {
      $match: {
        'paymentFor.month': month,
        'paymentFor.year': year,
        paymentStatus: 'Completed'
      }
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$amount' },
        totalPayments: { $sum: 1 }
      }
    }
  ]);
};

// Indexes for better query performance
paymentSchema.index({ student: 1, 'paymentFor.month': 1, 'paymentFor.year': 1 });
paymentSchema.index({ teacher: 1, paymentStatus: 1 });
paymentSchema.index({ dueDate: 1, paymentStatus: 1 });
paymentSchema.index({ paymentId: 1, receiptNumber: 1 });

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;