const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Subject name is required'],
    trim: true,
    maxlength: [100, 'Subject name cannot exceed 100 characters']
  },
  code: { 
    type: String, 
    required: [true, 'Subject code is required'],
    unique: true,
    uppercase: true,
    trim: true
  },
  marksObtained: { 
    type: Number, 
    required: [true, 'Marks obtained is required'], 
    min: [0, 'Marks cannot be negative'],
    validate: {
      validator: function(v) {
        return v <= this.maxMarks;
      },
      message: 'Marks obtained cannot exceed maximum marks'
    }
  },
  maxMarks: { 
    type: Number, 
    required: [true, 'Maximum marks is required'], 
    min: [0, 'Maximum marks cannot be negative'] 
  },
  grade: { 
    type: String, 
    required: [true, 'Grade is required'],
    enum: ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F']
  },
  attendance: { 
    type: Number, 
    required: [true, 'Attendance percentage is required'], 
    min: [0, 'Attendance cannot be less than 0%'], 
    max: [100, 'Attendance cannot exceed 100%']
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: [true, 'Teacher reference is required']
  },
  semester: {
    type: String,
    required: [true, 'Semester is required']
  },
  remarks: { 
    type: String,
    trim: true,
    maxlength: [500, 'Remarks cannot exceed 500 characters']
  },
  status: {
    type: String,
    enum: ['Active', 'Completed', 'Dropped'],
    default: 'Active'
  }
}, {
  timestamps: true
});

// Virtual for percentage calculation
subjectSchema.virtual('percentage').get(function() {
  return (this.marksObtained / this.maxMarks) * 100;
});

// Method to check if student is passing
subjectSchema.methods.isPassing = function() {
  return this.marksObtained >= (this.maxMarks * 0.4); // 40% passing criteria
};

// Indexes for better query performance
subjectSchema.index({ code: 1 });
subjectSchema.index({ teacher: 1 });

module.exports = subjectSchema;