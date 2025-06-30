const mongoose = require('mongoose');
const { Schema } = mongoose;

const detailStudentSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
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
        grade: String,
        yearOfStudy: Number,
        board: {
            type: String,
            trim: true
        }
    },
    subjects: [{
        subject: {
            type: Schema.Types.ObjectId,
            ref: 'Subject'
        },
        proficiencyLevel: {
            type: String,
            enum: ['beginner', 'intermediate', 'advanced'],
            default: 'beginner'
        },
        targetScore: {
            type: Number,
            min: 0,
            max: 100
        },
        currentScore: {
            type: Number,
            min: 0,
            max: 100,
            default: 0
        }
    }],
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
            status: {
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
            required: true
        },
        email: String,
        occupation: String
    },
    address: {
        street: String,
        city: String,
        state: String,
        pincode: String,
        country: String
    },
    ratings: [{
        type: Schema.Types.ObjectId,
        ref: 'Rating'
    }],
    isProfileComplete: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Indexes for better query performance
detailStudentSchema.index({ 'enrolledBatches.batch': 1 });
detailStudentSchema.index({ 'subjects.subject': 1 });
detailStudentSchema.index({ isProfileComplete: 1 });
detailStudentSchema.index({ 'education.currentLevel': 1 });

module.exports = mongoose.model('DetailStudent', detailStudentSchema);