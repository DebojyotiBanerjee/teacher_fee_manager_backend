const Notification = require('../models/notification.models');
const Batch = require('../models/batch.models');
const Course = require('../models/course.models');
const BatchEnrollment = require('../models/batchEnrollment.models');
const Payment = require('../models/payment.models');
const CourseApplication = require('../models/courseApplication.models');

// Helper function to get next class date for a batch
const getNextClassDate = (batch) => {
  const now = new Date();
  const batchStartDate = new Date(batch.startDate);
  
  // If batch hasn't started yet, return start date
  if (batchStartDate > now) {
    return batchStartDate;
  }
  
  const dayMap = {
    'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 
    'Thu': 4, 'Fri': 5, 'Sat': 6
  };
  
  const batchDays = batch.days.map(day => dayMap[day]).sort((a, b) => a - b);
  const currentDay = now.getDay();
  
  // Parse batch time (assuming format like "10:00 AM" or "14:30")
  const timeComponents = batch.time.split(' ');
  const timeStr = timeComponents[0];
  const period = timeComponents[1];
  const [hours, minutes] = timeStr.split(':').map(Number);
  let batchHour = hours;
  
  if (period && period.toUpperCase() === 'PM' && hours !== 12) {
    batchHour += 12;
  } else if (period && period.toUpperCase() === 'AM' && hours === 12) {
    batchHour = 0;
  }
  
  // Check if there's a class today
  if (batchDays.includes(currentDay)) {
    const todayClassTime = new Date(now);
    todayClassTime.setHours(batchHour, minutes || 0, 0, 0);
    
    if (todayClassTime > now) {
      return todayClassTime;
    }
  }
  
  // Find next class day in the week
  for (let i = 1; i <= 7; i++) {
    const checkDay = (currentDay + i) % 7;
    if (batchDays.includes(checkDay)) {
      const nextClassDate = new Date(now);
      nextClassDate.setDate(now.getDate() + i);
      nextClassDate.setHours(batchHour, minutes || 0, 0, 0);
      return nextClassDate;
    }
  }
  
  return null;
};

// Get upcoming batches for teacher
exports.getTeacherUpcomingBatches = async (teacherId) => {
  try {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
    
    const batches = await Batch.find({
      course: { $in: await Course.find({ teacher: teacherId }).distinct('_id') },
      isDeleted: false,
      startDate: { $lte: sevenDaysFromNow }
    })
      .populate('course', 'title');

    // Calculate next class date for each batch and filter
    const batchesWithNextClass = batches
      .map(batch => {
        const nextClassDate = getNextClassDate(batch);
        return nextClassDate ? { ...batch.toObject(), nextClassDate } : null;
      })
      .filter(batch => batch !== null)
      .filter(batch => batch.nextClassDate <= sevenDaysFromNow)
      .sort((a, b) => a.nextClassDate - b.nextClassDate)
      .slice(0, 3);

    return batchesWithNextClass;
  } catch (error) {
    console.error('Error getting teacher upcoming batches:', error);
    return [];
  }
};

// Get upcoming batches for student
exports.getStudentUpcomingBatches = async (studentId) => {
  try {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
    
    const studentEnrollments = await BatchEnrollment.find({ 
      student: studentId 
    }).populate('batch');

    const enrolledBatchIds = studentEnrollments
      .filter(enrollment => enrollment.batch && !enrollment.batch.isDeleted)
      .map(enrollment => enrollment.batch._id);

    const batches = await Batch.find({
      _id: { $in: enrolledBatchIds },
      isDeleted: false,
      startDate: { $lte: sevenDaysFromNow }
    })
      .populate('course', 'title');

    // Calculate next class date for each batch and filter
    const batchesWithNextClass = batches
      .map(batch => {
        const nextClassDate = getNextClassDate(batch);
        return nextClassDate ? { ...batch.toObject(), nextClassDate } : null;
      })
      .filter(batch => batch !== null)
      .filter(batch => batch.nextClassDate <= sevenDaysFromNow)
      .sort((a, b) => a.nextClassDate - b.nextClassDate)
      .slice(0, 3);

    return batchesWithNextClass;
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

    // Get upcoming batches with next class dates
    const upcomingBatches = await this.getTeacherUpcomingBatches(teacherId);

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
    console.error('Error getting teacher notifications:', error);
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

    // Get upcoming batches for courses the student has enrolled in
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
    
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

    // Get batches for these courses
    const batches = await Batch.find({
      course: { $in: enrolledCourseIds },
      isDeleted: false,
      startDate: { $lte: sevenDaysFromNow }
    })
      .populate('course', 'title');

    // Calculate next class date for each batch and filter
    const upcomingBatches = batches
      .map(batch => {
        const nextClassDate = getNextClassDate(batch);
        return nextClassDate ? { ...batch.toObject(), nextClassDate } : null;
      })
      .filter(batch => batch !== null)
      .filter(batch => batch.nextClassDate <= sevenDaysFromNow)
      .sort((a, b) => a.nextClassDate - b.nextClassDate)
      .slice(0, 3);

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