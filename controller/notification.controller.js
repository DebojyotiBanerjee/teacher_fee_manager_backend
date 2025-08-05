const Notification = require('../models/notification.models');
const Batch = require('../models/batch.models');
const Course = require('../models/course.models');
const BatchEnrollment = require('../models/batchEnrollment.models');
const { handleError, sendSuccessResponse, logControllerAction } = require('../utils/controllerUtils');

// Teacher: Get teacher notifications and upcoming batches
exports.getTeacherNotifications = async (req, res) => {
  try {
    logControllerAction('Get Teacher Notifications', req.user);
    
    if (req.user.role !== 'teacher') {
      return handleError(
        { name: 'Forbidden', message: 'Only teachers can view teacher notifications.' },
        res,
        'Only teachers can view teacher notifications.'
      );
    }

    // Pagination
    const page = parseInt(req.query.page) > 0 ? parseInt(req.query.page) : 1;
    const limit = parseInt(req.query.limit) > 0 ? parseInt(req.query.limit) : 10;
    const skip = (page - 1) * limit;

    // Get teacher's notifications
    const [notifications, total] = await Promise.all([
      Notification.find({ 
        teacher: req.user._id, 
        isDeleted: false 
      })
        .populate('relatedCourseId', 'title')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments({ 
        teacher: req.user._id, 
        isDeleted: false 
      })
    ]);

    // Get upcoming batches for the teacher (next 3 batches)
    const upcomingBatches = await Batch.find({
      course: { $in: await Course.find({ teacher: req.user._id }).distinct('_id') },
      isDeleted: false,
      startDate: { $gte: new Date() }
    })
      .populate('course', 'title')
      .sort({ startDate: 1 })
      .limit(3);

    // Get unread count
    const unreadCount = await Notification.countDocuments({
      teacher: req.user._id,
      status: 'unread',
      isDeleted: false
    });

    sendSuccessResponse(res, {
      notifications,
      upcomingBatches,
      unreadCount,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }, 'Teacher notifications retrieved successfully');
  } catch (err) {
    handleError(err, res, 'Failed to retrieve teacher notifications');
  }
};

// Student: Get student notifications and upcoming batches
exports.getStudentNotifications = async (req, res) => {
  try {
    logControllerAction('Get Student Notifications', req.user);
    
    if (req.user.role !== 'student') {
      return handleError(
        { name: 'Forbidden', message: 'Only students can view student notifications.' },
        res,
        'Only students can view student notifications.'
      );
    }

    // Pagination
    const page = parseInt(req.query.page) > 0 ? parseInt(req.query.page) : 1;
    const limit = parseInt(req.query.limit) > 0 ? parseInt(req.query.limit) : 10;
    const skip = (page - 1) * limit;

    // Get student's notifications
    const [notifications, total] = await Promise.all([
      Notification.find({ 
        student: req.user._id, 
        isDeleted: false 
      })
        .populate('relatedCourseId', 'title')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments({ 
        student: req.user._id, 
        isDeleted: false 
      })
    ]);

    // Get upcoming batches for the student (next 3 batches they're enrolled in)
    const studentEnrollments = await BatchEnrollment.find({ 
      student: req.user._id 
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

    // Get unread count
    const unreadCount = await Notification.countDocuments({
      student: req.user._id,
      status: 'unread',
      isDeleted: false
    });

    sendSuccessResponse(res, {
      notifications,
      upcomingBatches,
      unreadCount,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }, 'Student notifications retrieved successfully');
  } catch (err) {
    handleError(err, res, 'Failed to retrieve student notifications');
  }
};

// Mark notification as read
exports.markNotificationAsRead = async (req, res) => {
  try {
    logControllerAction('Mark Notification As Read', req.user, { params: req.params });
    
    const { notificationId } = req.params;
    
    if (!notificationId) {
      return handleError(
        { name: 'ValidationError', message: 'Notification ID is required.' },
        res,
        'Notification ID is required.'
      );
    }

    // Find and update the notification
    const notification = await Notification.findOneAndUpdate(
      { 
        _id: notificationId,
        $or: [
          { teacher: req.user._id },
          { student: req.user._id }
        ],
        isDeleted: false
      },
      { status: 'read' },
      { new: true }
    );

    if (!notification) {
      return handleError(
        { name: 'NotFound', message: 'Notification not found or you do not have access to it.' },
        res,
        'Notification not found or you do not have access to it.'
      );
    }

    sendSuccessResponse(res, notification, 'Notification marked as read successfully');
  } catch (err) {
    handleError(err, res, 'Failed to mark notification as read');
  }
};

// Mark all notifications as read
exports.markAllNotificationsAsRead = async (req, res) => {
  try {
    logControllerAction('Mark All Notifications As Read', req.user);
    
    // Update all unread notifications for the user
    const result = await Notification.updateMany(
      { 
        $or: [
          { teacher: req.user._id },
          { student: req.user._id }
        ],
        status: 'unread',
        isDeleted: false
      },
      { status: 'read' }
    );

    sendSuccessResponse(res, { 
      modifiedCount: result.modifiedCount 
    }, `${result.modifiedCount} notifications marked as read successfully`);
  } catch (err) {
    handleError(err, res, 'Failed to mark all notifications as read');
  }
}; 