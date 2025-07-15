const DetailStudent = require('../models/detailStudent.model');
const Batch = require('../models/batch.models');
const mongoose = require('mongoose');
const User = require('../models/user.models'); // Add this import

// --- Helper Functions ---
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const buildBatchFilters = async (body) => {
  const filters = {};
  const { subject, status, teacher, teacherName, mode, minFee, maxFee } = body;

  if (subject) filters.subject = subject;
  if (status) filters.batchStatus = status;
  if (teacher) filters.teacher = teacher;
  if (mode) filters.mode = mode;
  if (minFee || maxFee) {
    filters.feePerStudent = {};
    if (minFee) filters.feePerStudent.$gte = parseFloat(minFee);
    if (maxFee) filters.feePerStudent.$lte = parseFloat(maxFee);
  }
  if (teacherName) {
    const users = await User.find({ fullname: { $regex: teacherName, $options: 'i' } }).select('_id');
    const teacherIds = users.map(u => u._id);
    if (teacherIds.length > 0) {
      filters.teacher = { $in: teacherIds };
    } else {
      // No matching teachers, return impossible filter
      filters.teacher = { $in: [] };
    }
  }
  return filters;
};

const sendError = (res, status, message) => res.status(status).json({ success: false, error: message });
const sendSuccess = (res, data) => res.status(200).json({ success: true, data });

// Helper to check if all required fields are filled in detailStudent
function hasAllRequiredFields(detailStudent) {
  if (!detailStudent) return false;
  // Top-level required fields
  if (!detailStudent.user || !detailStudent.gender) return false;
  // Education required fields
  const edu = detailStudent.education || {};
  if (!edu.currentLevel || !edu.institution || !edu.grade || !edu.yearOfStudy) return false;
  // Guardian required fields
  const guardian = detailStudent.guardian || {};
  if (!guardian.name || !guardian.relation || !guardian.phone || !guardian.email || !guardian.occupation) return false;
  // At least one subject with subject field
  if (!Array.isArray(detailStudent.subjects) || detailStudent.subjects.length === 0) return false;
  if (!detailStudent.subjects[0].subject) return false;
  return true;
}

// --- Refactored Controllers ---

/**
 * POST /student-Flow/batches
 * View available batches (filtered)
 */
exports.getAvailableBatches = async (req, res) => {
  try {
    // Get student profile for eligibility filtering
    let detailStudent = null;
    if (req.user && req.user.id) {
      detailStudent = await DetailStudent.findOne({ user: req.user.id });
      if (!hasAllRequiredFields(detailStudent)) {
        return sendError(res, 403, 'You must complete all required profile sections to view available batches');
      }
    }
    const filters = await buildBatchFilters(req.body);
    const courses = await Batch.find(filters)
      .select('subject batchStatus teacher mode feePerStudent requiredLevel')
      .populate('teacherDetailId', 'user subjectsTaught') // for teacher details
      .populate('teacherFullName', 'fullname') // for user info (name, email, etc.)
      .sort({ createdAt: -1 });

    // Filter out batches the student is not eligible for
    let filteredCourses = courses;
    if (detailStudent && detailStudent.education && detailStudent.education.currentLevel) {
      filteredCourses = courses.filter(course =>
        !course.requiredLevel || course.requiredLevel === detailStudent.education.currentLevel
      );
    }

    filteredCourses = filteredCourses.map(course => ({
      subject: course.subject,
      status: course.batchStatus,
      teacherName: course.teacherFullName?.fullname,
      mode: course.mode,
      fee: course.feePerStudent,
      requiredLevel: course.requiredLevel
    }));

    if (filteredCourses.length === 0) {
      return sendError(res, 404, 'Search not found');
    }
    return sendSuccess(res, filteredCourses);
  } catch (err) {
    console.log(`Error in getAvailableBatches: ${err.message}`);
    return sendError(res, 500, 'Internal Server Error');
  }
};

/**
 * POST /student-Flow/batches/apply
 * Student applies to enroll in a batch
 */
exports.applyToBatch = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { batchId } = req.body;
    if (!isValidObjectId(batchId)) {
      return sendError(res, 400, 'Invalid batch ID');
    }
    const detailStudent = await DetailStudent.findOne({ user: studentId });
    if (!detailStudent) {
      return sendError(res, 404, 'Student profile not found. Please complete your profile first.');
    }
    if (!hasAllRequiredFields(detailStudent)) {
      return sendError(res, 403, 'You must complete all required profile sections to apply for a batch');
    }
    if (!detailStudent.isProfileComplete) {
      return sendError(res, 400, 'Please complete your profile before enrolling in batches');
    }
    const batch = await Batch.findById(batchId);
    if (!batch) {
      return sendError(res, 404, 'Batch not found');
    }
    // Eligibility check: student's currentLevel must match batch.requiredLevel
    if (
      batch.requiredLevel &&
      (!detailStudent.education || detailStudent.education.currentLevel !== batch.requiredLevel)
    ) {
      return sendError(res, 403, 'You do not meet the required level for this batch');
    }
    if (!['upcoming', 'ongoing'].includes(batch.batchStatus)) {
      return sendError(res, 400, 'This batch is not accepting enrollments');
    }
    if (batch.students.length >= batch.maxStrength) {
      return sendError(res, 400, 'Batch is full');
    }
    const alreadyEnrolled = detailStudent.enrolledBatches.some(
      (enroll) => enroll.batch.toString() === batchId
    );
    if (alreadyEnrolled) {
      return sendError(res, 400, 'Already enrolled in this batch');
    }
    const requiresApproval = batch.requiresApproval || false;
    const enrollmentStatus = requiresApproval ? 'pending' : 'active';
    detailStudent.enrolledBatches.push({
      batch: batchId,
      status: enrollmentStatus,
      enrollmentDate: new Date(),
      attendance: { present: 0, total: 0 },
      assignments: [],
      progress: 0,
      feePaid: false
    });
    await detailStudent.save();
    await Batch.findByIdAndUpdate(batchId, {
      $addToSet: { students: detailStudent._id }
    });
    const message = requiresApproval
      ? 'Applied to batch successfully. Awaiting teacher approval.'
      : 'Enrolled in batch successfully.';
    return sendSuccess(res, {
      message,
      enrollmentStatus,
      batchId,
      enrollmentDate: new Date()
    });
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};







// 3. Approval: Teacher may approve/reject the student's enrollment (optional)
exports.approveEnrollment = async (req, res) => {
  try {
    const { studentId, batchId, action } = req.body; // action: 'approve' or 'reject'
    const teacherId = req.user.id;

    // Validate inputs
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Use "approve" or "reject"' });
    }

    // Find the batch and verify teacher ownership
    const batch = await Batch.findById(batchId);
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    if (batch.teacher.toString() !== teacherId) {
      return res.status(403).json({ error: 'Not authorized to approve enrollments for this batch' });
    }

    // Find student profile
    const detailStudent = await DetailStudent.findOne({ user: studentId });
    if (!detailStudent) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    // Find the enrollment
    const enrollmentIndex = detailStudent.enrolledBatches.findIndex(
      (enroll) => enroll.batch.toString() === batchId
    );

    if (enrollmentIndex === -1) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    const enrollment = detailStudent.enrolledBatches[enrollmentIndex];

    if (enrollment.status !== 'pending') {
      return res.status(400).json({ error: 'Enrollment is not pending approval' });
    }

    if (action === 'approve') {
      // Approve the enrollment
      enrollment.status = 'active';
      await detailStudent.save();

      res.json({
        message: 'Enrollment approved successfully',
        studentId,
        batchId,
        status: 'active'
      });
    } else {
      // Reject the enrollment
      detailStudent.enrolledBatches.splice(enrollmentIndex, 1);
      await detailStudent.save();

      // Remove student from batch
      await Batch.findByIdAndUpdate(batchId, {
        $pull: { students: detailStudent._id }
      });

      res.json({
        message: 'Enrollment rejected',
        studentId,
        batchId,
        status: 'rejected'
      });
    }

  } catch (err) {
    console.log(`Error in approveEnrollment: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
};

// 4. Participation: Student attends classes, pays fees, and can view their batch details
exports.getMyBatches = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { status } = req.query; // Optional filter by enrollment status

    const detailStudent = await DetailStudent.findOne({ user: studentId })
      .populate({
        path: 'enrolledBatches.batch',
        populate: {
          path: 'teacher',
          select: 'user subjectsTaught',
          populate: { path: 'user', select: 'name email' }
        }
      });

    if (!detailStudent) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    let enrollments = detailStudent.enrolledBatches;

    // Filter by status if provided
    if (status) {
      enrollments = enrollments.filter(enrollment => enrollment.status === status);
    }

    // Sort by enrollment date (newest first)
    enrollments.sort((a, b) => new Date(b.enrollmentDate) - new Date(a.enrollmentDate));

    res.json({
      studentId: detailStudent._id,
      totalEnrollments: detailStudent.enrolledBatches.length,
      enrollments
    });

  } catch (err) {
    console.log(`Error in getMyBatches: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
};

// 5. Get enrollment details for a specific batch
exports.getEnrollmentDetails = async (req, res) => {
  try {
    const studentId = req.user.id;
    const batchId = req.params.batchId;

    const detailStudent = await DetailStudent.findOne({ user: studentId })
      .populate({
        path: 'enrolledBatches.batch',
        populate: {
          path: 'teacher',
          select: 'user subjectsTaught',
          populate: { path: 'user', select: 'name email phone' }
        }
      });

    if (!detailStudent) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const enrollment = detailStudent.enrolledBatches.find(
      enroll => enroll.batch._id.toString() === batchId
    );

    if (!enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    res.json({
      enrollment,
      batch: enrollment.batch,
      teacher: enrollment.batch.teacher
    });

  } catch (err) {
    console.log(`Error in getEnrollmentDetails: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
};

// 6. Update attendance (for teachers or automated system)
exports.updateAttendance = async (req, res) => {
  try {
    const { studentId, batchId, isPresent } = req.body;
    const teacherId = req.user.id;

    // Verify teacher owns the batch
    const batch = await Batch.findById(batchId);
    if (!batch || batch.teacher.toString() !== teacherId) {
      return res.status(403).json({ error: 'Not authorized to update attendance for this batch' });
    }

    const detailStudent = await DetailStudent.findOne({ user: studentId });
    if (!detailStudent) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const enrollment = detailStudent.enrolledBatches.find(
      enroll => enroll.batch.toString() === batchId
    );

    if (!enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    // Update attendance
    enrollment.attendance.total += 1;
    if (isPresent) {
      enrollment.attendance.present += 1;
    }

    await detailStudent.save();

    res.json({
      message: 'Attendance updated successfully',
      attendance: enrollment.attendance,
      attendancePercentage: (enrollment.attendance.present / enrollment.attendance.total) * 100
    });

  } catch (err) {
    console.log(`Error in updateAttendance: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
};

// 7. Mark fee as paid
exports.markFeePaid = async (req, res) => {
  try {
    const { studentId, batchId } = req.body;
    const teacherId = req.user.id;

    // Verify teacher owns the batch
    const batch = await Batch.findById(batchId);
    if (!batch || batch.teacher.toString() !== teacherId) {
      return res.status(403).json({ error: 'Not authorized to update fee status for this batch' });
    }

    const detailStudent = await DetailStudent.findOne({ user: studentId });
    if (!detailStudent) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const enrollment = detailStudent.enrolledBatches.find(
      enroll => enroll.batch.toString() === batchId
    );

    if (!enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    enrollment.feePaid = true;
    await detailStudent.save();

    res.json({
      message: 'Fee marked as paid successfully',
      feePaid: true
    });

  } catch (err) {
    console.log(`Error in markFeePaid: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
}; 