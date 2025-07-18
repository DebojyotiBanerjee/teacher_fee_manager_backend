const mongoose = require('mongoose');
const { Schema } = mongoose;

const detailStudentSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
      } ,
    gender: {
        type: String,
        enum: ['male', 'female', 'other', 'prefer_not_to_say'],
        required: true
    },
    education: {
        currentLevel: {
            type: String,
            required: true,
            trim: true
        },
        institution: {
            type: String,
            required: true,
            trim: true
        },
        grade: {
            type: String,
            required: true,
            trim: true
        },
        yearOfStudy: {
            type: Number,
            required: true
        },
        board: {
            type: String,
            trim: true
        }
    },
    guardian: {
        name: {
            type: String,
            required: true
        },
        relation: {
            type: String,
            required: true
        },
        phone: {
            type: String,
            required: true,
            trim: true
        },
        email: {
            type: String,
            required: true,
            trim: true
        },
        occupation: {
            type: String,
            required: true,
            trim: true
        }
    },
    address: {
        street: String,
        city: String,
        state: String,
        pincode: String,
        country: String
    },
    dob: {
        type: Date
    }


}, {
    timestamps: true
});


detailStudentSchema.index({ 'education.currentLevel': 1 });





module.exports = mongoose.model('DetailStudent', detailStudentSchema);
