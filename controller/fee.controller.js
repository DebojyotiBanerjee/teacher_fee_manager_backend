const Course = require('../models/course.models');
const Batch = require('../models/batch.models');
const BatchEnrollment = require('../models/batchEnrollment.models');
const Payment = require('../models/payment.models');
const Fee = require('../models/fee.models');
const OfflinePayment = require('../models/offlinePayment.models');
const mongoose = require('mongoose');
const { teacherHasQRCode, handleError, sendSuccessResponse } = require('../utils/controllerUtils');
const CloudinaryService = require('../utils/cloudinaryService');



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
      .populate('course', 'title duration fee') // Added fee field
      .populate('teacher', 'fullname email')
      .populate('batch', 'batchName')
      .sort({ paidAt: -1 });

    // Add fee information to each payment
    const paymentsWithFee = payments.map(payment => {
      const paymentObj = payment.toObject();
      paymentObj.amount = payment.course ? payment.course.fee : 0;
      return paymentObj;
    });

    sendSuccessResponse(res, paymentsWithFee, 'Payment history retrieved successfully');
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
      .populate('course', 'title duration fee') // Added fee field
      .sort({ paidAt: -1 });

    // Add fee information to each payment
    const paymentsWithFee = payments.map(payment => {
      const paymentObj = payment.toObject();
      paymentObj.amount = payment.course ? payment.course.fee : 0;
      return paymentObj;
    });

    // Each payment includes screenshotUrl and course fee
    sendSuccessResponse(res, paymentsWithFee, 'Teacher payment history retrieved successfully');
  } catch (err) {
    handleError(err, res, 'Failed to retrieve teacher payment history');
  }
};


// Student: Pay for a course (monthly, with screenshot upload and transactionId)
exports.studentPayForCourse = async (req, res) => {
  try {
    // Ensure student role
    console.log("req.fields:", req.fields);
    console.log("req.files:", req.files);

    if (!req.user || req.user.role !== 'student') {
      return handleError({ name: 'Forbidden', message: 'Access denied: Only students can perform this action.' }, res, 'Access denied: Only students can perform this action.', 403);
    }
    const studentId = req.user._id;
    // Get data from formidable fields
    // Always use the first value if it's an array, else the value itself
    const courseId = Array.isArray(req.fields.courseId) ? req.fields.courseId[0] : req.fields.courseId;
    const batchId = Array.isArray(req.fields.batchId) ? req.fields.batchId[0] : req.fields.batchId;
    const transactionId = Array.isArray(req.fields.transactionId) ? req.fields.transactionId[0] : req.fields.transactionId;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return handleError({ name: 'ValidationError', message: 'Invalid course ID.' }, res, 'Invalid course ID.', 400);
    }
    if (!transactionId || typeof transactionId !== 'string' || !transactionId.trim()) {
      return handleError({ name: 'ValidationError', message: 'Transaction ID is required.' }, res, 'Transaction ID is required.', 400);
    }
    // Check enrollment (robust: check all enrollments for this student)
    const enrollments = await BatchEnrollment.find({ student: studentId });
    let isEnrolled = false;
    for (const enrollment of enrollments) {
      if (enrollment.course && enrollment.course.toString() === courseId.toString()) {
        isEnrolled = true;
        break;
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

    const batch = await Batch.findById(batchId);
    if (!batch || batch.isDeleted) {
      return handleError({ name: 'NotFound', message: 'Batch not found or deleted.' }, res, 'Batch not found or deleted.', 404);
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
    // Get the uploaded screenshot
    if (!req.files || !req.files.screenshot) {
      return handleError({ name: 'ValidationError', message: 'Payment screenshot is required.' }, res, 'Payment screenshot is required.', 400);
    }

    const screenshotFile = req.files.screenshot;

    // Upload screenshot to Cloudinary using our service
    const uploadResult = await CloudinaryService.uploadPaymentScreenshot(screenshotFile);
    // Check both regular and offline payments for the current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Check regular payments
    const regularPayment = await Payment.findOne({
      student: studentId,
      course: courseId,
      paidAt: { $gte: startOfMonth, $lte: endOfMonth },
      status: 'paid'
    });

    // Check offline payments
    const offlinePayment = await OfflinePayment.findOne({
      student: studentId,
      course: courseId,
      paymentDate: { $gte: startOfMonth, $lte: endOfMonth },
      status: 'paid'
    });

    if (regularPayment || offlinePayment) {
      const existingPayment = regularPayment || offlinePayment;
      return handleError(
        { name: 'ValidationError', message: 'You have already paid for this month. Next payment due: ' + existingPayment.nextDueDate.toISOString().slice(0, 10) },
        res,
        'You have already paid for this month. Next payment due: ' + existingPayment.nextDueDate.toISOString().slice(0, 10),
        400
      );
    }

    // If no payment exists for this month, create a new payment record
    let nextDueDate = new Date(now);
    nextDueDate.setDate(nextDueDate.getDate() + 30);
    let payment = await Payment.findOne({ student: studentId, course: courseId });

    if (payment) {
      // Delete old screenshot if it exists
      if (payment.cloudinaryPublicId) {
        await CloudinaryService.deleteFile(payment.cloudinaryPublicId);
      }

      payment.screenshotUrl = uploadResult.url;
      payment.cloudinaryPublicId = uploadResult.public_id;
      payment.paidAt = now;
      payment.nextDueDate = nextDueDate;
      payment.status = 'paid';
      payment.transactionId = transactionId;
      await payment.save();
    } else {
      payment = await Payment.create({
        student: studentId,
        course: courseId,
        batch: batchId,
        teacher: course.teacher,
        screenshotUrl: uploadResult.url,
        cloudinaryPublicId: uploadResult.public_id,
        paidAt: now,
        nextDueDate,
        status: 'paid',
        transactionId
      });
    }
    // Get the populated payment with course details
    const populatedPayment = await Payment.findById(payment._id)
      .populate('course', 'title duration fee')
      .populate('batch', 'batchName')

    sendSuccessResponse(res, {
      paymentId: payment._id,
      screenshotUrl: payment.screenshotUrl,
      paidAt: payment.paidAt,
      nextDueDate: payment.nextDueDate,
      status: payment.status,
      transactionId: payment.transactionId,
      amount: populatedPayment.course.fee,
      course: {
        title: populatedPayment.course.title,
        duration: populatedPayment.course.duration,
        fee: populatedPayment.course.fee
      },
      batch: {
        batchName: populatedPayment.batch.batchName
      }
    }, 'Payment successful. Next payment due: ' + payment.nextDueDate.toISOString().slice(0, 10));
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

    if (!req.files || !req.files.qrCode) {
      return res.status(400).json({ success: false, message: 'QR code image is required.' });
    }

    const qrFile = req.files.qrCode;

    // Upload to Cloudinary using our service
    const uploadResult = await CloudinaryService.uploadQRCode(qrFile);

    const fee = await Fee.create({
      teacher: teacherId,
      qrCodeUrl: uploadResult.url,
      cloudinaryPublicId: uploadResult.public_id,
      qrUploadedAt: new Date()
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

    if (!fee) {
      return res.status(404).json({ success: false, message: 'QR code not found' });
    }

    // Get the uploaded file
    const qrCodeFile = req.files.qrCode;
    if (!qrCodeFile) {
      return res.status(400).json({ success: false, message: 'No QR code image provided' });
    }

    // Delete old image from Cloudinary if exists
    if (fee.cloudinaryPublicId) {
      await CloudinaryService.deleteFile(fee.cloudinaryPublicId);
    }

    // Upload new image
    const uploadResult = await CloudinaryService.uploadFile(qrCodeFile, {
      folder: 'qr_codes'
    });

    // Update fee record
    fee.qrCodeUrl = uploadResult.url;
    fee.cloudinaryPublicId = uploadResult.public_id;
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
    const fee = await Fee.findOne({ teacher: teacherId });

    if (!fee) {
      return res.status(404).json({ success: false, message: 'QR code not found' });
    }

    // Delete image from Cloudinary if exists
    if (fee.cloudinaryPublicId) {
      await CloudinaryService.deleteFile(fee.cloudinaryPublicId);
    }

    // Delete the fee record
    await fee.deleteOne();

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
        // Check last payment from both regular and offline payments
        const [lastRegularPayment, lastOfflinePayment] = await Promise.all([
          Payment.findOne({
            student: studentId,
            course: course._id
          }).sort({ paidAt: -1 }),
          OfflinePayment.findOne({
            student: studentId,
            course: course._id
          }).sort({ paymentDate: -1 })
        ]);

        // Use the most recent payment between regular and offline
        const lastPayment = lastRegularPayment && lastOfflinePayment
          ? (lastRegularPayment.paidAt > lastOfflinePayment.paymentDate ? lastRegularPayment : lastOfflinePayment)
          : (lastRegularPayment || lastOfflinePayment);

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


// Teacher: Record offline payment from student
exports.createOfflinePayment = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'teacher') {
      return handleError({ name: 'Forbidden', message: 'Access denied: Only teachers can record offline payments.' }, res, 'Access denied: Only teachers can record offline payments.', 403);
    }

    const teacherId = req.user._id;
    const { studentId, courseId, amount,batchId, paymentDate } = req.body;

    // Validate required fields
    if (!studentId || !courseId || !paymentDate) {
      return handleError({ name: 'ValidationError', message: 'Missing required fields.' }, res, 'All fields are required.', 400);
    }

    if (!mongoose.Types.ObjectId.isValid(studentId) || !mongoose.Types.ObjectId.isValid(courseId) || !mongoose.Types.ObjectId.isValid(batchId)) {
      return handleError({ name: 'ValidationError', message: 'Invalid student or course ID or batch Id' }, res, 'Invalid IDs provided.', 400);
    }

    // Verify course belongs to teacher
    const course = await Course.findOne({ _id: courseId, teacher: teacherId, isDeleted: false });
    if (!course) {
      return handleError({ name: 'NotFound', message: 'Course not found or not authorized.' }, res, 'Course not found or not authorized.', 404);
    }

    const batch = await Batch.findOne({_id: batchId, isDeleted: false});
    if(!batch){
      return handleError({ name: 'NotFound', message: 'Batch not found or not authorized.' }, res, 'Batch not found or not authorized.', 404);
    }

    // Verify student is enrolled
    const enrollments = await BatchEnrollment.find({ student: studentId }).populate('batch');
    let isEnrolled = false;

    for (const enrollment of enrollments) {
      if (enrollment.batch && enrollment.batch.course && enrollment.batch.course.toString() === courseId.toString()) {
        isEnrolled = true;
        break;
      }
    }

    if (!isEnrolled) {
      return handleError({ name: 'Forbidden', message: 'Student is not enrolled in this course.' }, res, 'Student is not enrolled in this course.', 403);
    }


    // Calculate next due date
    const paymentDateObj = new Date(paymentDate);
    const nextDueDate = new Date(paymentDateObj);
    nextDueDate.setDate(nextDueDate.getDate() + 30);

    // Check if payment already exists for this month
    const existingPayment = await Payment.findOne({
      student: studentId,
      course: courseId,
      paidAt: {
        $gte: new Date(paymentDateObj.getFullYear(), paymentDateObj.getMonth(), 1),
        $lt: new Date(paymentDateObj.getFullYear(), paymentDateObj.getMonth() + 1, 1)
      },
      status: 'paid'
    });

    if (existingPayment) {
      return handleError({ name: 'ValidationError', message: 'Payment already recorded for this month.' }, res, 'Payment already recorded for this month.', 400);
    }

    // Create offline payment record
    const offlinePayment = await OfflinePayment.create({
      student: studentId,
      teacher: teacherId,
      course: courseId,
      batch: batchId,
      paymentDate: paymentDateObj,
      nextDueDate,
      amount: amount,
      notes: req.body.notes
    });

    // Create regular payment record to track due dates
    await Payment.create({
      student: studentId,
      teacher: teacherId,
      course: courseId,
      batch:batchId,
      paidAt: paymentDateObj,
      nextDueDate,
      status: 'paid',
      paymentMethod: 'cash',
      amount: course.fee
    });

    // Get the populated offline payment with course details
    const populatedPayment = await OfflinePayment.findById(offlinePayment._id)
      .populate('course', 'title duration fee')
      .populate('batch', 'batchName')
      .populate('student', 'fullname email');

    const responseData = populatedPayment.toObject();
    responseData.amount = populatedPayment.course.fee;

    sendSuccessResponse(res, responseData, 'Offline payment recorded successfully', 201);
  } catch (err) {
    handleError(err, res, 'Failed to record offline payment');
  }
};

// Teacher: Get offline payments by courseId (renamed)
exports.getOfflinePaymentsByCourseId = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'teacher') {
      return handleError({ name: 'Forbidden', message: 'Access denied: Only teachers can view offline payments.' }, res, 'Access denied: Only teachers can view offline payments.', 403);
    }

    const teacherId = req.user._id;
    const { startDate, endDate, courseId } = req.query;

    if (!courseId) {
      return handleError({ name: 'ValidationError', message: 'courseId query parameter is required.' }, res, 'courseId query parameter is required.', 400);
    }

    let query = { teacher: teacherId, course: courseId };

    if (startDate && endDate) {
      query.paymentDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const payments = await OfflinePayment.find(query)
      .populate('student', 'fullname email')
      .populate('course', 'title duration fee')
      .populate('batch', 'batchName')
      .sort({ paymentDate: -1 });

    const paymentsWithFee = payments.map(payment => {
      const paymentObj = payment.toObject();
      paymentObj.amount = payment.course ? payment.course.fee : 0;
      return paymentObj;
    });

    sendSuccessResponse(res, paymentsWithFee, 'Offline payments retrieved successfully');
  } catch (err) {
    handleError(err, res, 'Failed to retrieve offline payments');
  }
};

// Teacher: Get all offline payments (new method)
exports.getOfflinePayments = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'teacher') {
      return handleError({ name: 'Forbidden', message: 'Access denied: Only teachers can view offline payments.' }, res, 'Access denied: Only teachers can view offline payments.', 403);
    }

    const teacherId = req.user._id;
    const { startDate, endDate } = req.query;

    let query = { teacher: teacherId };

    if (startDate && endDate) {
      query.paymentDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const payments = await OfflinePayment.find(query)
      .populate('student', 'fullname email')
      .populate('course', 'title duration fee')
      .populate('batch', 'batchName')
      .sort({ paymentDate: -1 });

    const paymentsWithFee = payments.map(payment => {
      const paymentObj = payment.toObject();
      paymentObj.amount = payment.course ? payment.course.fee : 0;
      return paymentObj;
    });

    sendSuccessResponse(res, paymentsWithFee, 'All offline payments retrieved successfully');
  } catch (err) {
    handleError(err, res, 'Failed to retrieve offline payments');
  }
};


// Teacher: Delete offline payment
exports.deleteOfflinePayment = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'teacher') {
      return handleError({ name: 'Forbidden', message: 'Access denied: Only teachers can delete offline payments.' }, res, 'Access denied: Only teachers can delete offline payments.', 403);
    }

    const { paymentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
      return handleError({ name: 'ValidationError', message: 'Invalid payment ID.' }, res, 'Invalid payment ID.', 400);
    }

    const payment = await OfflinePayment.findOne({
      _id: paymentId,
      teacher: req.user._id
    });

    if (!payment) {
      return handleError({ name: 'NotFound', message: 'Payment not found or not authorized.' }, res, 'Payment not found or not authorized.', 404);
    }

    // Also delete the corresponding regular payment record
    await Payment.deleteOne({
      student: payment.student,
      course: payment.course,
      batch: payment.batch,
      paidAt: payment.paymentDate,
      paymentMethod: 'cash'
    });

    await payment.deleteOne();
    sendSuccessResponse(res, null, 'Offline payment deleted successfully');
  } catch (err) {
    handleError(err, res, 'Failed to delete offline payment');
  }
};
