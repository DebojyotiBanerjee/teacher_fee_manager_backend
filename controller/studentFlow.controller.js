const DetailStudent = require('../models/detailStudent.model');
const Batch = require('../models/batch.models');
const mongoose = require('mongoose');

// 1. View Batches: Student browses available batches/enrollments (filtered)
exports.getAvailableBatches = async (req, res) => {
  try {
    const filters = {};
    
    // Basic filters
    if (req.query.subject) filters.subject = req.query.subject;
    if (req.query.status) filters.status = req.query.status;
    if (req.query.teacher) filters.teacher = req.query.teacher;
    if (req.query.mode) filters.mode = req.query.mode; // online/offline mode
    
<<<<<<< HEAD
<<<<<<< HEAD
    
=======
    // Filter by start date range
    if (req.query.startDate || req.query.endDate) {
      filters['schedule.startDate'] = {};
      if (req.query.startDate) filters['schedule.startDate'].$gte = new Date(req.query.startDate);
      if (req.query.endDate) filters['schedule.startDate'].$lte = new Date(req.query.endDate);
    }
>>>>>>> af6bf79 (done-student-flow-filter)
=======
    
>>>>>>> 05c8616 (refactor: remove start date filtering from getAvailableBatches function)
    
    // Filter by fee range
    if (req.query.minFee || req.query.maxFee) {
      filters.fee = {};
      if (req.query.minFee) filters.fee.$gte = parseFloat(req.query.minFee);
      if (req.query.maxFee) filters.fee.$lte = parseFloat(req.query.maxFee);
    }
    
    // Filter by available seats
    if (req.query.hasSeats === 'true') {
      filters.$expr = {
        $lt: [{ $size: '$students' }, '$maxStudents']
      };
    }
    
    // Only show active/upcoming batches
    filters.status = { $in: ['upcoming', 'ongoing'] };
    
    const batches = await Batch.find(filters)
      .populate('teacher', 'user subjectsTaught')
      .populate('students', 'user education')
      .sort({ 'schedule.startDate': 1 });
    
    // Add eligibility check for each batch
    const studentId = req.user?.id;
    let studentProfile = null;
    
    if (studentId) {
      studentProfile = await DetailStudent.findOne({ user: studentId });
    }
    
    const batchesWithEligibility = batches.map(batch => {
      const batchObj = batch.toObject();
      
      // Check if student is already enrolled
      const isEnrolled = studentProfile ? 
        studentProfile.enrolledBatches.some(enroll => 
          enroll.batch.toString() === batch._id.toString()
        ) : false;
      
      // Check eligibility based on student profile
      let eligibility = {
        isEligible: true,
        reasons: []
      };
      
      if (studentProfile) {
        // Check if batch is full
        if (batch.students.length >= batch.maxStudents) {
          eligibility.isEligible = false;
          eligibility.reasons.push('Batch is full');
        }
        
        // Check if already enrolled
        if (isEnrolled) {
          eligibility.isEligible = false;
          eligibility.reasons.push('Already enrolled');
        }
        
        // Check education level compatibility (basic check)
        if (studentProfile.education.currentLevel && batch.requiredLevel) {
          const levelOrder = ['primary', 'secondary', 'higher_secondary', 'undergraduate', 'postgraduate'];
          const studentLevel = levelOrder.indexOf(studentProfile.education.currentLevel.toLowerCase());
          const requiredLevel = levelOrder.indexOf(batch.requiredLevel.toLowerCase());
          
          if (studentLevel < requiredLevel) {
            eligibility.isEligible = false;
            eligibility.reasons.push('Education level not sufficient');
          }
        }
      }
      
      return {
        ...batchObj,
        isEnrolled,
        eligibility,
        availableSeats: batch.maxStudents - batch.students.length
      };
    });
    
    res.json(batchesWithEligibility);
  } catch (err) {
    console.log(`Error in getAvailableBatches: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
};

// 2. Apply/Enroll: Student applies to enroll in a batch
exports.applyToBatch = async (req, res) => {
  try {
    const studentId = req.user.id;
    const batchId = req.params.batchId;
    
    // Validate batch ID
    if (!mongoose.Types.ObjectId.isValid(batchId)) {
      return res.status(400).json({ error: 'Invalid batch ID' });
    }
    
    // Find student profile
    const detailStudent = await DetailStudent.findOne({ user: studentId });
    if (!detailStudent) {
      return res.status(404).json({ error: 'Student profile not found. Please complete your profile first.' });
    }
    
    // Check if profile is complete
    if (!detailStudent.isProfileComplete) {
      return res.status(400).json({ error: 'Please complete your profile before enrolling in batches' });
    }
    
    // Find the batch
    const batch = await Batch.findById(batchId);
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }
    
    // Check if batch is accepting enrollments
    if (!['upcoming', 'ongoing'].includes(batch.status)) {
      return res.status(400).json({ error: 'This batch is not accepting enrollments' });
    }
    
    // Check if batch is full
    if (batch.students.length >= batch.maxStudents) {
      return res.status(400).json({ error: 'Batch is full' });
    }
    
    // Check if already enrolled/applied
    const alreadyEnrolled = detailStudent.enrolledBatches.some(
      (enroll) => enroll.batch.toString() === batchId
    );
    
    if (alreadyEnrolled) {
      return res.status(400).json({ error: 'Already enrolled in this batch' });
    }
    
    // Check for approval requirement (optional feature)
    const requiresApproval = batch.requiresApproval || false;
    const enrollmentStatus = requiresApproval ? 'pending' : 'active';
    
    // Add to enrolledBatches
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
    
    // Add student to Batch.students array
    await Batch.findByIdAndUpdate(batchId, { 
      $addToSet: { students: detailStudent._id } 
    });
    
    const message = requiresApproval 
      ? 'Applied to batch successfully. Awaiting teacher approval.'
      : 'Enrolled in batch successfully.';
    
    res.json({ 
      message,
      enrollmentStatus,
      batchId,
      enrollmentDate: new Date()
    });
    
  } catch (err) {
    console.log(`Error in applyToBatch: ${err.message}`);
    res.status(500).json({ error: err.message });
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