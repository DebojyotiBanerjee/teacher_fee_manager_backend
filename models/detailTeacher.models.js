const mongoose = require('mongoose');
const { Schema } = mongoose;

const detailTeacherSchema = new Schema({   
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  qualifications: [{
    degree: {
      type: String,
      required: true
    },
    institution: {
      type: String,
      required: true
    },
    yearCompleted: {
      type: Number,
      required: true
    }
  }],
  experience: {
    years: {
      type: Number,
      default: 0
    },
    previousInstitutions: [String]
  },
  bio: {
    type: String,
    maxlength: 500
  },
  subjectsTaught: [{
    type: String,
    required: true
  }],
  availability: {
    monday: [{ start: String, end: String }],
    tuesday: [{ start: String, end: String }],
    wednesday: [{ start: String, end: String }],
    thursday: [{ start: String, end: String }],
    friday: [{ start: String, end: String }],
    saturday: [{ start: String, end: String }],
    sunday: [{ start: String, end: String }]
  },
  socialMedia: {
    linkedIn: String
  },
  batches: [{
    type: Schema.Types.ObjectId,
    ref: 'Batch'
  }],
  ratings: [{
    type: Schema.Types.ObjectId,
    ref: 'Rating',
    default: []
  }],
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalRatings: {
    type: Number,
    default: 0
  },
  isProfileComplete: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for better query performance

detailTeacherSchema.index({ 'subjectsTaught': 1 });
detailTeacherSchema.index({ averageRating: -1 });

module.exports = mongoose.model('DetailTeacher', detailTeacherSchema);