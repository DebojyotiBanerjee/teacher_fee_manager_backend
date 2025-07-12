const mongoose = require('mongoose');
const { Schema } = mongoose;

const batchSchema = new Schema({
  subject: {
    type: String,
    required: true,
    trim: true
  },

  teacher: {
    type: Schema.Types.ObjectId,
    ref: 'DetailTeacher',
    required: true
  },

  board: {
    type: String,
    required: true,
    enum: ['CBSE', 'ICSE', 'State Board', 'IB', 'Other']
  },

  mode: {
    type: String,
    enum: ['online', 'offline'],
    required: true
  },

  

  daysOfWeek: [{
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    required: true
  }],

  timeSlot: {
    type: String,
    required: true,
    unique: true, // Acts as primary key across all batches
    trim: true
  },

  feeRange: {
    min: {
      type: Number,
      required: true,
      min: 0
    },
    max: {
      type: Number,
      required: true,
      min: 0
    }
  },

  eligibility: {
    type: String,
    required: true,
    trim: true
  },

  dob: {
    type: Date 
  },

  location: {
    type: String,
    required: true,
    trim: true
  },

  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  }
}, {
  timestamps: true
});



module.exports = mongoose.model('Batch', batchSchema);
