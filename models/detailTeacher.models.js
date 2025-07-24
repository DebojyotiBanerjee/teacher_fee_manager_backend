const mongoose = require('mongoose');
const { Schema } = mongoose;

const detailTeacherSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer_not_to_say'],
    required: true
  },
  qualifications: [{
    degree: {
      type: String,
      required: true
    },
    institution: {
      type: String,
      required: true
    }
  }],
  experience: {
    years: {
      type: Number,
      default: 0,
      required: true
    },
    previousInstitutions: [String]
  },
  address: {
    street: { type: String },
    city: { type: String },
    state: { type: String },
    pincode: { type: String }
  },
  subjectsTaught: [{
    type: String,
    required: true
  }],
  socialMedia: {
    linkedIn: String
  },
  profilePic: {
    type: String,
    trim: true
  },
  isProfileComplete: {
    type: Boolean, default: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

detailTeacherSchema.virtual('phone').get(function () {
  return this.user ? this.user.phone : undefined;
});




module.exports = mongoose.model('DetailTeacher', detailTeacherSchema);