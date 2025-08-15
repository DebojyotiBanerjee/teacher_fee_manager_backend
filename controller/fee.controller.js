
const Course = require('../models/course.models');
const BatchEnrollment = require('../models/batchEnrollment.models');
const Payment = require('../models/payment.models');
const Fee = require('../models/fee.models');
const mongoose = require('mongoose');
const { teacherHasQRCode, handleError, sendSuccessResponse } = require('../utils/controllerUtils');
const cloudinary = require('../utils/cloudinaryUtils');


const ensureTeacherRole = (req, res) => {
  if (!req.user || req.user.role !== 'teacher') {
    res.status(403).json({ success: false, message: 'Access denied: Only teachers can perform this action.' });
    return false;
  }
  return true;
};


// Student: Get own payment history
exports.getStudentPaymentHistory = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'student') {
      return handleError('Access denied: Only students can access this information', res, null, 403);
    }
    const studentId = req.user._id;
    // Only allow access to own payment history
    const payments = await Payment.find({ student: studentId })
      .populate('course', 'title duration')
      .populate('teacher', 'fullname email')
      .sort({ paidAt: -1 });
    sendSuccessResponse(res, payments, 'Payment history retrieved successfully');
  } catch (err) {
    handleError(err, res, 'Failed to retrieve payment history');
  }
};

// Teacher: Get payment history for their courses
exports.getTeacherPaymentHistory = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'teacher') {
      return handleError({ name: 'Forbidden', message: 'Access denied: Only teachers can access this information.' }, res, 'Access denied: Only teachers can access this information.', 403);
    }
    const teacherId = req.user._id;
    // Only allow access to own payment history (for their courses)
    const payments = await Payment.find({ teacher: teacherId })
      .populate('student', 'fullname email')
      .populate('course', 'title duration')
      .sort({ paidAt: -1 });
    // Each payment includes screenshotUrl (student's uploaded screenshot)
    sendSuccessResponse(res, payments, 'Teacher payment history retrieved successfully');
  } catch (err) {
    handleError(err, res, 'Failed to retrieve teacher payment history');
  }
};


// Student: Pay for a course (monthly, with screenshot upload)
exports.studentPayForCourse = async (req, res) => {
  try {
    // Ensure student role
    if (!req.user || req.user.role !== 'student') {
      return handleError({ name: 'Forbidden', message: 'Access denied: Only students can perform this action.' }, res, 'Access denied: Only students can perform this action.', 403);
    }
    const studentId = req.user._id;
    const { courseId } = req.body;
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return handleError({ name: 'ValidationError', message: 'Invalid course ID.' }, res, 'Invalid course ID.', 400);
    }
    // Check enrollment (robust: check all enrollments for this student)
    const enrollments = await BatchEnrollment.find({ student: studentId });
    let isEnrolled = false;
    for (const enrollment of enrollments) {
      if (enrollment.course && enrollment.course.toString() === courseId.toString()) {
        isEnrolled = true;
        break;
      } else if (enrollment.batch) {
        const batch = await enrollment.populate('batch');
        if (batch && batch.batch && batch.batch.course && batch.batch.course.toString() === courseId.toString()) {
          isEnrolled = true;
          break;
        }
      }
    }
    if (!isEnrolled) {
      return handleError({ name: 'Forbidden', message: 'You are not enrolled in this course.' }, res, 'You are not enrolled in this course.', 403);
    }
    // Get course and teacher
    const course = await Course.findById(courseId);
    if (!course || course.isDeleted) {
      return handleError({ name: 'NotFound', message: 'Course not found or deleted.' }, res, 'Course not found or deleted.', 404);
    }
    // Calculate course end date
    const durationStr = course.duration ? course.duration.toLowerCase() : '';
    let courseEndDate = new Date(course.createdAt);
    if (durationStr.includes('week')) {
      const weeks = parseInt(durationStr);
      courseEndDate.setDate(courseEndDate.getDate() + (weeks * 7));
    } else if (durationStr.includes('month')) {
      const months = parseInt(durationStr);
      courseEndDate.setMonth(courseEndDate.getMonth() + months);
    } else if (durationStr.includes('day')) {
      const days = parseInt(durationStr);
      courseEndDate.setDate(courseEndDate.getDate() + days);
    } else {
      courseEndDate.setDate(courseEndDate.getDate() + 30);
    }
    if (new Date() > courseEndDate) {
      return handleError({ name: 'ValidationError', message: 'Course has already ended.' }, res, 'Course has already ended.', 400);
    }
    // Get teacher's QR
    const fee = await Fee.findOne({ teacher: course.teacher });
    if (!fee) {
      return handleError({ name: 'NotFound', message: 'Teacher QR code not found.' }, res, 'Teacher QR code not found.', 404);
    }
    if (!req.file) {
      return handleError({ name: 'ValidationError', message: 'No payment screenshot uploaded.' }, res, 'No payment screenshot uploaded.', 400);
    }
    // Upload screenshot to Cloudinary
    const upload = await cloudinary.uploader.upload(req.file.path, { folder: 'payment_screenshots' });
    // Payment model: create or update a payment record (one per student-course)
    let payment = await Payment.findOne({ student: studentId, course: courseId });
    const now = new Date();
    let nextDueDate = new Date(now);
    nextDueDate.setDate(nextDueDate.getDate() + 30);
    if (payment) {
      if (payment.status === 'paid' && payment.nextDueDate > now) {
        return handleError({ name: 'ValidationError', message: 'You have already paid for this month. Next payment due: ' + payment.nextDueDate.toISOString().slice(0,10) }, res, 'You have already paid for this month. Next payment due: ' + payment.nextDueDate.toISOString().slice(0,10), 400);
      }
      payment.screenshotUrl = upload.secure_url;
      payment.paidAt = now;
      payment.nextDueDate = nextDueDate;
      payment.status = 'paid';
      await payment.save();
    } else {
      payment = await Payment.create({
        student: studentId,
        course: courseId,
        teacher: course.teacher,
        screenshotUrl: upload.secure_url,
        paidAt: now,
        nextDueDate,
        status: 'paid'
      });
    }
    sendSuccessResponse(res, {
      paymentId: payment._id,
      screenshotUrl: payment.screenshotUrl,
      paidAt: payment.paidAt,
      nextDueDate: payment.nextDueDate,
      status: payment.status
    }, 'Payment successful. Next payment due: ' + payment.nextDueDate.toISOString().slice(0,10));
  } catch (err) {
    handleError(err, res, 'Failed to process payment');
  }
};


// Teacher: Create QR code (only once per teacher)
exports.createQRCode = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ success: false, message: 'Access denied: Only teachers can perform this action.' });
    }
    const teacherId = req.user._id;
    if (await teacherHasQRCode(teacherId, Fee)) {
      return res.status(409).json({
        success: false,
        message: 'QR code already exists for this teacher.'
      });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }
    // Upload to Cloudinary
    const upload = await cloudinary.uploader.upload(req.file.path, { folder: 'qr_codes' });
    const fee = await Fee.create({
      teacher: teacherId,
      qrCodeUrl: upload.secure_url
    });
    sendSuccessResponse(res, fee, 'QR code created successfully', 201);
  } catch (err) {
    handleError(err, res, 'Failed to create QR code');
  }
};

// Teacher: Get QR code
exports.getQRCode = async (req, res) => {
  try {
    if (!ensureTeacherRole(req, res)) return;
    const teacherId = req.user._id;
    const fee = await Fee.findOne({ teacher: teacherId }).populate({
      path: 'teacher',
      select: 'fullname email'
    });
    if (!fee) return res.status(404).json({ success: false, message: 'QR code not found' });
    const result = {
      qrCodeUrl: fee.qrCodeUrl,
      qrUploadedAt: fee.qrUploadedAt,
      teacher: {
        fullname: fee.teacher.fullname,
        email: fee.teacher.email
      }
    };
    sendSuccessResponse(res, result, 'QR code fetched successfully');
  } catch (err) {
    handleError(err, res, 'Failed to fetch QR code');
  }
};

// Teacher: Update QR code (replace image in Cloudinary)
exports.updateQRCode = async (req, res) => {
  try {
    const teacherId = req.user._id;
    const fee = await Fee.findOne({ teacher: teacherId });
    if (!fee) return res.status(404).json({ success: false, message: 'QR code not found' });
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });
    // Optionally: delete old image from Cloudinary (if you store public_id)
    const upload = await cloudinary.uploader.upload(req.file.path, { folder: 'qr_codes' });
    fee.qrCodeUrl = upload.secure_url;
    fee.qrUploadedAt = new Date();
    await fee.save();
    sendSuccessResponse(res, fee, 'QR code updated successfully');
  } catch (err) {
    handleError(err, res, 'Failed to update QR code');
  }
};

// Teacher: Delete QR code
exports.deleteQRCode = async (req, res) => {
  try {
    const teacherId = req.user._id;
    const fee = await Fee.findOneAndDelete({ teacher: teacherId });
    if (!fee) return res.status(404).json({ success: false, message: 'QR code not found' });
    // Optionally: delete image from Cloudinary (if you store public_id)
    sendSuccessResponse(res, null, 'QR code deleted successfully');
  } catch (err) {
    handleError(err, res, 'Failed to delete QR code');
  }
};



// Student: Get upcoming payments
exports.getUpcomingPayments = async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only students can access this information'
      });
    }
    
    const studentId = req.user._id;
    const now = new Date();
    
    // Get all courses student is enrolled in
    const BatchEnrollment = require('../models/batchEnrollment.models');
    const enrollments = await BatchEnrollment.find({ student: studentId });
    const courseIds = enrollments.map(e => e.course);
    
    // Get courses that haven't ended yet
    const Course = require('../models/course.models');
    const activeCourses = await Course.find({ 
      _id: { $in: courseIds },
      isDeleted: { $ne: true }
    });
    
    const upcomingPayments = [];
    
    for (const course of activeCourses) {
      // Check course end date
      const durationStr = course.duration.toLowerCase();
      let courseEndDate = new Date(course.createdAt);
      
      if (durationStr.includes('week')) {
        const weeks = parseInt(durationStr);
        courseEndDate.setDate(courseEndDate.getDate() + (weeks * 7));
      } else if (durationStr.includes('month')) {
        const months = parseInt(durationStr);
        courseEndDate.setMonth(courseEndDate.getMonth() + months);
      } else if (durationStr.includes('day')) {
        const days = parseInt(durationStr);
        courseEndDate.setDate(courseEndDate.getDate() + days);
      } else {
        courseEndDate.setDate(courseEndDate.getDate() + 30);
      }
      
      if (new Date() <= courseEndDate) {
        // Check last payment for this course
        const lastPayment = await Payment.findOne({ 
          student: studentId, 
          course: course._id 
        }).sort({ paidAt: -1 });
        
        let dueDate;
        let status = 'pending';
        
        if (lastPayment) {
          dueDate = new Date(lastPayment.nextDueDate);
          if (dueDate < now) {
            status = 'overdue';
          }
        } else {
          // First payment, due immediately
          dueDate = new Date();
        }
        
        upcomingPayments.push({
          course: {
            _id: course._id,
            title: course.title,
            duration: course.duration
          },
          lastPayment: lastPayment,
          nextDueDate: dueDate,
          status: status
        });
      }
    }
    
    sendSuccessResponse(res, upcomingPayments, 'Upcoming payments retrieved successfully');
  } catch (err) {
    handleError(err, res, 'Failed to retrieve upcoming payments');
  }
};

// Check and update overdue payments
exports.checkOverduePayments = async (req, res) => {
  try {
    const now = new Date();
    
    // Find all payments that are overdue
    const overduePayments = await Payment.find({
      nextDueDate: { $lt: now },
      status: { $in: ['paid', 'pending'] },
      isRecurring: true
    });
    
    // Update status to overdue
    const updatedPayments = await Payment.updateMany(
      {
        nextDueDate: { $lt: now },
        status: { $in: ['paid', 'pending'] },
        isRecurring: true
      },
      { status: 'overdue' }
    );
    
    if (req && res) {
      sendSuccessResponse(res, {
        updatedCount: updatedPayments.modifiedCount,
        overduePayments: overduePayments.length
      }, 'Overdue payments checked and updated');
    }
    
    return {
      updatedCount: updatedPayments.modifiedCount,
      overduePayments: overduePayments.length
    };
  } catch (err) {
    if (req && res) {
  handleError(err, res, 'Failed to check overdue payments');
    }
    console.error('Error checking overdue payments:', err);
    throw err;
  }
};
