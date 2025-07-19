const mongoose = require('mongoose');
const { Schema } = mongoose;

const batchSchema = new Schema({
  batchName: {
    type: String,
    required: true,
    trim: true
  },
  course: {
    type: Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  days: {
    type: [String],
    required: true,
    enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  },
  time: {
    type: String,
    required: true
  },
  mode: {
    type: String,
    required: true,
    enum: ['online', 'offline', 'hybrid']
  },
  maxStrength: {
    type: Number,
    required: true,
    min: 1
  },
  currentStrength: {
    type: Number,
    default: 0
  },
  description: {
    type: String,
    required: true,
    maxlength: 150
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Batch', batchSchema);
