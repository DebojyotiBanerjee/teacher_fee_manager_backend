const mongoose = require('mongoose');
const { Schema } = mongoose;

const detailStudentSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
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
    proficiencyLevel: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced'],
        default: 'beginner'
    },

    enrolledBatches: [{
        batch: {
            type: Schema.Types.ObjectId,
            ref: 'Batch'
        },
        enrollmentDate: {
            type: Date,
            default: Date.now
        },
        status: {
            type: String,
            enum: ['active', 'completed', 'dropped'],
            default: 'active'
        },
        attendance: {
            present: {
                type: Number,
                default: 0
            },
            total: {
                type: Number,
                default: 0
            }
        },
        assignments: [{
            title: String,
            dueDate: Date,
            assignmentStatus: {
                type: String,
                enum: ['pending', 'submitted', 'graded'],
                default: 'pending'
            },
            score: {
                type: Number,
                min: 0,
                max: 100
            }
        }],
        progress: {
            type: Number,
            min: 0,
            max: 100,
            default: 0
        },
        feePaid: {
            type: Boolean,
            default: false
        }
    }],
    academicPerformance: {
        averageScore: {
            type: Number,
            min: 0,
            max: 100,
            default: 0
        },
        strengths: [String],
        areasForImprovement: [String]
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
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    location: {
        type: String,
        trim: true
    },

    // teacher available classes 
    classPreferences: {
        daysOfWeek: [{
            type: String,
            enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        }],
        preferredTimeSlot: {
            type: String,
            enum: ['Morning', 'Afternoon', 'Evening'],
            default: 'Evening'
        }
    },
    isProfileComplete: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Indexes for better query performance
detailStudentSchema.index({ 'enrolledBatches.batch': 1 });
detailStudentSchema.index({ isProfileComplete: 1 });
detailStudentSchema.index({ 'education.currentLevel': 1 });

// Virtual for phone number from user model
detailStudentSchema.virtual('phone').get(function () {
    return this.user ? this.user.phone : undefined;
});

// Ensure virtual fields are included when converting to JSON
detailStudentSchema.set('toJSON', { virtuals: true });
detailStudentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('DetailStudent', detailStudentSchema);
