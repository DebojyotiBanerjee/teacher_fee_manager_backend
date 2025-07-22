const mongoose = require('mongoose');
const { Schema } = mongoose;

const courseSchema = new Schema({
    title: {
      type: String,
      required: true,
      trim: true
    },
    subtitle: {
      type: String,
      trim: true,
      maxlength: 150
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500
    },
    prerequisites: {
      type: String,
      trim: true
    },
    fee: {
      type: Number,
      required: true,
      min: 0
    },
    duration: {
      type: String, // e.g., '8 weeks', '10 hours'
      required: true,
      trim: true
    },
    syllabus: {
      type: [String],
      required: true
    },
    
    teacher: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    
  }, {
    timestamps: true
  });

module.exports = mongoose.model('Course', courseSchema); 