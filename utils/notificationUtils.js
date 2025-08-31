const Notification = require('../models/notification.models');
const Batch = require('../models/batch.models');
const Course = require('../models/course.models');
const BatchEnrollment = require('../models/batchEnrollment.models');
const Payment = require('../models/payment.models');
const CourseApplication = require('../models/courseApplication.models');

// Get upcoming batches for teacher
exports.getTeacherUpcomingBatches = async (teacherId) => {
  try {
    const upcomingBatches = await Batch.find({
      course: { $in: await Course.find({ teacher: teacherId }).distinct('_id') },
      isDeleted: false,
      startDate: { $gte: new Date() }
    })
      .populate('course', 'title')
      .sort({ startDate: 1 })
      .limit(3);

    return upcomingBatches;
  } catch (error) {
    console.error('Error getting teacher upcoming batches:', error);
    return [];
  }
};

// Get upcoming batches for student
exports.getStudentUpcomingBatches = async (studentId) => {
  try {
    const studentEnrollments = await BatchEnrollment.find({ 
      student: studentId 
    }).populate('batch');

    const enrolledBatchIds = studentEnrollments
      .filter(enrollment => enrollment.batch && !enrollment.batch.isDeleted)
      .map(enrollment => enrollment.batch._id);

    const upcomingBatches = await Batch.find({
      _id: { $in: enrolledBatchIds },
      isDeleted: false,
      startDate: { $gte: new Date() }
    })
      .populate('course', 'title')
      .sort({ startDate: 1 })
      .limit(3);

    return upcomingBatches;
  } catch (error) {
    console.error('Error getting student upcoming batches:', error);
    return [];
  }
};

// Get teacher notifications
exports.getTeacherNotifications = async (teacherId, page = 1, limit = 10) => {
  try {
    const skip = (page - 1) * limit;
    
    const [notifications, total] = await Promise.all([
      Notification.find({ 
        teacher: teacherId, 
        isDeleted: false 
      })
        .populate('relatedCourseId', 'title')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments({ 
        teacher: teacherId, 
        isDeleted: false 
      })
    ]);

    const unreadCount = await Notification.countDocuments({
      teacher: teacherId,
      status: 'unread',
      isDeleted: false
    });

    return {
      notifications,
      total,
      unreadCount,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  } catch (error) {
    console.error('Error getting teacher notifications:', error);
    return {
      notifications: [],
      total: 0,
      unreadCount: 0,
      page,
      limit,
      totalPages: 0
    };
  }
};

// Get student notifications
exports.getStudentNotifications = async (studentId, page = 1, limit = 10) => {
  try {
    const skip = (page - 1) * limit;
    
    const [notifications, total] = await Promise.all([
      Notification.find({ 
        student: studentId, 
        isDeleted: false 
      })
        .populate('relatedCourseId', 'title')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments({ 
        student: studentId, 
        isDeleted: false 
      })
    ]);

    const unreadCount = await Notification.countDocuments({
      student: studentId,
      status: 'unread',
      isDeleted: false
    });

    // Get upcoming batches for courses the student has enrolled in (paid for)
    
    // Find courses the student has paid for or enrolled in
    const [studentPayments, studentEnrollments] = await Promise.all([
      Payment.find({ 
        student: studentId, 
        status: 'paid' 
      }).distinct('course'),
      CourseApplication.find({ 
        student: studentId 
      }).distinct('course')
    ]);

    // Combine both paid courses and enrolled courses
    const enrolledCourseIds = [...new Set([...studentPayments, ...studentEnrollments])];

    // Get upcoming batches for these courses
    const upcomingBatches = await Batch.find({
      course: { $in: enrolledCourseIds },
      isDeleted: false,
      startDate: { $gte: new Date() }
    })
      .populate('course', 'title')
      .sort({ startDate: 1 })
      .limit(3);

    return {
      notifications,
      total,
      unreadCount,
      upcomingBatches,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  } catch (error) {
    console.error('Error getting student notifications:', error);
    return {
      notifications: [],
      total: 0,
      unreadCount: 0,
      upcomingBatches: [],
      page,
      limit,
      totalPages: 0
    };
  }
};

// Mark notification as read
exports.markNotificationAsRead = async (notificationId, userId) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { 
        _id: notificationId,
        $or: [
          { teacher: userId },
          { student: userId }
        ],
        isDeleted: false
      },
      { status: 'read' },
      { new: true }
    );

    return notification;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return null;
  }
};

// Mark all notifications as read
exports.markAllNotificationsAsRead = async (userId) => {
  try {
    const result = await Notification.updateMany(
      { 
        $or: [
          { teacher: userId },
          { student: userId }
        ],
        status: 'unread',
        isDeleted: false
      },
      { status: 'read' }
    );

    return result.modifiedCount;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return 0;
  }
}; 