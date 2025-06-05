const mongoose = require('mongoose');

const {hashPassword,comparePassword} = require('../middleware/auth.middleware');


const teacherSchema = new mongoose.Schema({
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
  
  // Authentication
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  
  // Professional Information
  employeeId: {
    type: String,
    required: [true, 'Employee ID is required'],
    unique: true,
    uppercase: true
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    enum: ['Mathematics', 'Science', 'English', 'Social Studies', 'Computer Science', 'Arts', 'Physical Education', 'Other']
  },
  subjects: [{
    type: String,
    required: true
  }],
  qualification: {
    type: String,
    required: [true, 'Qualification is required']
  },
  experience: {
    type: Number,
    required: [true, 'Experience is required'],
    min: [0, 'Experience cannot be negative']
  },
  
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
  
  // Fee Structure
  hourlyRate: {
    type: Number,
    required: [true, 'Hourly rate is required'],
    min: [0, 'Hourly rate cannot be negative']
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  joinDate: {
    type: Date,
    default: Date.now
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
teacherSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual to get students taught by this teacher
teacherSchema.virtual('students', {
  ref: 'Student',
  localField: '_id',
  foreignField: 'teacher'
});

// hash password 12
teacherSchema.pre('save', hashPassword);
  

  


// Instance method to check password
teacherSchema.methods.correctPassword = comparePassword;


// Index for better query performance
teacherSchema.index({ email: 1, employeeId: 1 });

const Teacher = mongoose.model('Teacher', teacherSchema);

module.exports = Teacher;