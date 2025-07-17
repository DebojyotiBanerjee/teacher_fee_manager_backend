const mongoose = require('mongoose');
const { Schema } = mongoose;

const detailTeacherSchema = new Schema({     
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
    pincode: { type: String },
    country: { type: String }
  },
  subjectsTaught: [{
    type: String,
    required: true
  }],  
  socialMedia: {
    linkedIn: String
  }  
}, {
  timestamps: true
});

detailTeacherSchema.virtual('phone').get(function() {
  return this.user ? this.user.phone : undefined;
});


detailTeacherSchema.set('toJSON', { virtuals: true });
detailTeacherSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('DetailTeacher', detailTeacherSchema);