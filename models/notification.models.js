const mongoose = require('mongoose');
const { Schema } = mongoose;

const notificationSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['batch_reminder', 'course_update', 'upcoming_batch'],
    default: 'general'
  },
  status: {
    type: String,
    required: true,
    enum: ['unread', 'read'],
    default: 'unread'
  },
  relatedCourseId: {
    type: Schema.Types.ObjectId,
    ref: 'Course',
    required: false
  },
  teacher: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  student: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for efficient queries
notificationSchema.index({ teacher: 1, status: 1, createdAt: -1 });
notificationSchema.index({ student: 1, status: 1, createdAt: -1 });
notificationSchema.index({ type: 1, status: 1 });

module.exports = mongoose.model('Notification', notificationSchema); 