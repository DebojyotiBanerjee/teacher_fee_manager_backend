const mongoose = require('mongoose');
const {calculatePercentage} = require('../middleware/academic.middleware');


const studentSchema = new mongoose.Schema({
  // Personal Information
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit phone number']
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'Date of birth is required']
  },
  
  // Academic Information
  
  grade: {
    type: String,
    required: [true, 'Grade is required'],
    enum: ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th']
  },
  section: {
    type: String,
    required: [true, 'Section is required'],
    uppercase: true,
    maxlength: [2, 'Section cannot exceed 2 characters']
  },
  rollNumber: {
    type: Number,
    required: [true, 'Roll number is required'],
    min: [1, 'Roll number must be positive']
  },
  
  // Teacher Assignment
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: [true, 'Teacher assignment is required']
  },
  
  // Subjects
  subjects: [{
    name: {
      type: String,
      required: true
    },
    isOptional: {
      type: Boolean,
      default: false
    }
  }],
  
  // Address
  address: {
    street: {
      type: String,
      required: [true, 'Street address is required']
    },
    city: {
      type: String,
      required: [true, 'City is required']
    },
    state: {
      type: String,
      required: [true, 'State is required']
    },
    pincode: {
      type: String,
      required: [true, 'Pincode is required'],
      match: [/^[0-9]{6}$/, 'Please enter a valid 6-digit pincode']
    }
  },
  
  // Parent/Guardian Information
  parentInfo: {
    guardianName: {
      type: String,
      required: [true, 'Guardian name is required'],
      trim: true
    },
    guardianRelation: {
      type: String,
      required: [true, 'Guardian relation is required'],
      trim: true
    },
    guardianPhone: {
      type: String,
      required: [true, 'Guardian phone is required'],
      match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit phone number']
    },
    guardianEmail: {
      type: String,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    occupation: {
      type: String,
      trim: true
    }
  },
  
  // Fee Information
  feeStructure: {
    monthlyFee: {
      type: Number,
      required: [true, 'Monthly fee is required'],
      min: [0, 'Monthly fee cannot be negative']
    },
    admissionFee: {
      type: Number,
      default: 0,
      min: [0, 'Admission fee cannot be negative']
    },
    examFee: {
      type: Number,
      default: 0,
      min: [0, 'Exam fee cannot be negative']
    },
    
  },
  
  // Academic Performance
  academicRecord: [{
    term: {
      type: String,
      required: true,
      enum: ['Term 1', 'Term 2', 'Annual']
    },
    year: {
      type: Number,
      required: true
    },
    totalMarks: {
      type: Number,
      min: 0
    },
    obtainedMarks: {
      type: Number,
      min: 0
    },
    percentage: {
      type: Number,
      min: 0,
      max: 100
    },    
  }],
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  
  // Profile Image
  profileImage: {
    type: String,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full name
studentSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for age calculation
studentSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

// Virtual to get payments made by this student
studentSchema.virtual('payments', {
  ref: 'Payment',
  localField: '_id',
  foreignField: 'student'
});

// Virtual for total fee calculation
studentSchema.virtual('totalMonthlyFee').get(function() {
  const fees = this.feeStructure;
  return fees.monthlyFee + fees.examFee + fees.libraryFee + fees.labFee;
});

// Pre-save middleware to calculate percentage
studentSchema.pre('save', calculatePercentage);

// Index for better query performance
studentSchema.index({ studentId: 1, email: 1, teacher: 1 });
studentSchema.index({ grade: 1, section: 1 });

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;



