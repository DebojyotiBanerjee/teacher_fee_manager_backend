const Payment = require('../models/payment.models');
const User = require('../models/user.models');
const nodemailer = require('nodemailer');

// Utility: Send email (simple version, configure as needed)
async function sendEmail(to, subject, text) {
  // Configure your transporter with real credentials in production
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
  await transporter.sendMail({ from: process.env.EMAIL_USER, to, subject, text });
}

// 1. Notify students 7 days before fee due date
exports.notifyUpcomingFeeDue = async () => {
  try {
    const now = new Date();
    const sevenDaysLater = new Date(now);
    sevenDaysLater.setDate(now.getDate() + 7);
    // Find payments due in 7 days and not yet paid for next cycle
    const payments = await Payment.find({
      nextDueDate: { $gte: sevenDaysLater.setHours(0,0,0,0), $lt: sevenDaysLater.setHours(23,59,59,999) },
      status: { $ne: 'overdue' }
    }).populate('student course');
    for (const payment of payments) {
      // Create notification for student
      await Notification.create({
        student: payment.student._id,
        message: `Your fee for course "${payment.course.title}" is due on ${payment.nextDueDate.toISOString().slice(0,10)}. Please pay on time to avoid interruption.`,
        relatedCourseId: payment.course._id,
        status: 'unread',
        isDeleted: false
      });
    }
    return { notified: payments.length };
  } catch (err) {
    console.error('Error notifying students of upcoming fee due:', err);
    throw err;
  }
};

// 2. Email students on due date if not paid
exports.emailFeeDueToday = async () => {
  try {
    const now = new Date();
    const todayStart = new Date(now.setHours(0,0,0,0));
    const todayEnd = new Date(now.setHours(23,59,59,999));
    const payments = await Payment.find({
      nextDueDate: { $gte: todayStart, $lte: todayEnd },
      status: { $ne: 'paid' }
    }).populate('student course');
    for (const payment of payments) {
      const student = payment.student;
      if (student && student.email) {
        await sendEmail(
          student.email,
          'Course Fee Payment Due',
          `Dear ${student.fullname || 'Student'},\nYour fee for course "${payment.course.title}" is due today (${payment.nextDueDate.toISOString().slice(0,10)}). Please pay as soon as possible.`
        );
      }
    }
    return { emailed: payments.length };
  } catch (err) {
    console.error('Error emailing students for fee due today:', err);
    throw err;
  }
};

// 3. Notify student and teacher after payment (to be called after payment success)
exports.notifyPaymentSuccess = async (studentId, courseId, paidAt) => {
  try {
    const course = await Course.findById(courseId).populate('teacher', 'fullname');
    // Notify student
    await Notification.create({
      student: studentId,
      message: `On ${paidAt.toISOString().slice(0,10)}, you paid for course "${course.title}".`,
      relatedCourseId: courseId,
      status: 'unread',
      isDeleted: false
    });
    // Notify teacher
    if (course && course.teacher && course.teacher._id) {
      await Notification.create({
        teacher: course.teacher._id,
        message: `A student has paid for your course "${course.title}" on ${paidAt.toISOString().slice(0,10)}.`,
        relatedCourseId: courseId,
        status: 'unread',
        isDeleted: false
      });
    }
  } catch (err) {
    console.error('Error notifying after payment:', err);
  }
};
const Notification = require('../models/notification.models');
const Batch = require('../models/batch.models');
const Course = require('../models/course.models');
const BatchEnrollment = require('../models/batchEnrollment.models');
const { handleError, sendSuccessResponse, logControllerAction } = require('../utils/controllerUtils');

// Teacher: Get teacher notifications, upcoming batches, and recent student payments
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

    // Get recent student payments (last 5 payments for teacher's courses)
    const recentPayments = await Payment.find({
      teacher: req.user._id,
      status: 'paid'
    })
      .populate('student', 'fullname email')
      .populate('course', 'title')
      .sort({ paidAt: -1 })
      .limit(5);

    sendSuccessResponse(res, {
      notifications,
      upcomingBatches,
      unreadCount,
      recentPayments,
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