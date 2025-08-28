const BatchEnrollment = require('../models/batchEnrollment.models');
const Batch = require('../models/batch.models');
const Course = require('../models/course.models');
const fee = require('../models/payment.models');
const { handleError, sendSuccessResponse } = require('../utils/controllerUtils');

// STUDENT: Enroll in a batch
exports.enrollInBatch = async (req, res) => {
  try {
    const { batchId } = req.body;
    const studentId = req.user._id;

    if (!batchId) {
      return handleError({ name: 'ValidationError' }, res, 'Batch ID is required');
    }

    const batch = await Batch.findOne({ _id: batchId, isDeleted: false }).populate('course');
    if (!batch) {
      return handleError({ name: 'NotFound' }, res, 'Batch not found');
    }

    if (batch.currentStrength >= batch.maxStrength) {
      return handleError({ name: 'Forbidden' }, res, 'Batch is full');
    }

    // Check if student has already enrolled in another batch for the same course
    const alreadyEnrolled = await BatchEnrollment.findOne({
      student: studentId,
      batch: { $ne: batchId }
    }).populate('batch');
    if (alreadyEnrolled && alreadyEnrolled.batch.course.toString() === batch.course._id.toString()) {
      return handleError({ name: 'Duplicate', message: 'Already enrolled in another batch for this course' }, res);
    }

    // Check if student is already enrolled in a batch with the same timing
    const sameTimeBatch = await BatchEnrollment.findOne({ student: studentId }).populate('batch');
    if (sameTimeBatch && sameTimeBatch.batch.time === batch.time) {
      return handleError({ name: 'Duplicate' }, res, 'Already enrolled in a batch with the same timing');
    }

    // Check if student has paid for this course
    const payment = await fee.findOne({
      student: studentId,
      course: batch.course._id,
      status: 'paid'
    });
    if (!payment) {
      return handleError({ name: 'Forbidden', message: 'You must pay for the course before enrolling in a batch.' }, res, 'You must pay for the course before enrolling in a batch.', 403);
    }

    // Proceed with enrollment
    await BatchEnrollment.create({ batch: batchId, student: studentId });

    // Update current strength count
    const count = await BatchEnrollment.countDocuments({ batch: batchId });
    await Batch.findByIdAndUpdate(batchId, { currentStrength: count });

    sendSuccessResponse(res, { batchId, currentStrength: count, maxStrength: batch.maxStrength }, 'Enrolled in batch successfully', 201);

  } catch (err) {
    handleError(err, res, 'Failed to enroll in batch');
  }
};

exports.getStudentEnrolledBatches = async (req, res) => {
  try {
    const studentId = req.user._id;

    if (!studentId) {
      ({ name: 'ValidationError' }, res, "Student Id is required");
    }

    const enrollments = await BatchEnrollment.find({ student: studentId })
      .populate({
        path: "batch",
        match: { isDeleted: false },
        select: "batchName days time mode",
        populate: {
          path: "course",
          select: "title description"
        }
      })
      .sort({ enrolledAt: -1 });

    const filteredEnrollments = enrollments.filter(
      (e) => e.batch !== null && e.batch.course !== null
    );

    sendSuccessResponse(res, {
      filteredEnrollments
    }, "Student's enrolled batches retrieved successfully")
  } catch (error) {
    handleError(err, res, "Failed to retrieve enrolled batches")
  }
}

// TEACHER: Unenroll a student from a batch
exports.unenrollStudentFromBatch = async (req, res) => {
  try {
    // Destructure request body for clear testing
    const { batchId, studentId } = req.body;

    if (!batchId || !studentId) {
      return handleError({ name: 'ValidationError' }, res, 'Batch ID and Student ID are required');
    }
    const batch = await Batch.findOne({ _id: batchId, isDeleted: false });
    if (!batch) {
      return handleError({ name: 'NotFound', message: 'Batch not found or has been deleted' }, res);
    }
    // Only the teacher who owns the course can unenroll
    const course = await Course.findOne({ _id: batch.course, teacher: req.user._id });
    if (!course) {
      return handleError({ name: 'Forbidden' }, res, 'You do not own this batch');
    }
    // Debug: Check if enrollment exists
    const existingEnrollment = await BatchEnrollment.findOne({ batch: batchId, student: studentId });
    console.log('Existing enrollment:', existingEnrollment);
    console.log('Searching for batchId:', batchId, 'studentId:', studentId);

    // Remove enrollment
    const result = await BatchEnrollment.findOneAndDelete({ batch: batchId, student: studentId });
    if (!result) {
      return handleError({ name: 'NotFound', message: 'Student not enrolled in this batch' }, res);
    }
    // Always recalculate currentStrength
    const count = await BatchEnrollment.countDocuments({ batch: batchId });
    await Batch.findByIdAndUpdate(batchId, { currentStrength: count });
    sendSuccessResponse(res, null, 'Student unenrolled from batch successfully');
  } catch (err) {
    handleError(err, res, 'Failed to unenroll student from batch');
  }
};