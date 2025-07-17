const mongoose = require('mongoose');
const { Schema } = mongoose;

const courseSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength:200
  },
  category: {
    type: [String],
    required: true,
    trim: true
  },
  fee: {
    type: Number,
    required: true,
    min: 0
  },
  duration: {
    type: String, // e.g., '2 hrs', '3 hrs', etc.
    required: true,
    trim: true,
    
  },
  syllabus: {
    type: [String],
    required: true,
    trim: true
  }  
}, {
  timestamps: true
});

module.exports = mongoose.model('Course', courseSchema); 