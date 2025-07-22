const Batch = require('../models/batch.models');
const Course = require('../models/course.models');
const DetailTeacher = require('../models/detailTeacher.models');
const CourseApplication = require('../models/courseApplication.models');
const Attendance = require('../models/attendance.models');
const BatchEnrollment = require('../models/batchEnrollment.models');

const { handleError, sendSuccessResponse, canAccessCourse, logControllerAction, isOwner } = require('../utils/controllerUtils');
const { sanitizeRequest } = require('../utils/sanitizer');

// Teacher: Create batch
exports.createBatch = async (req, res) => {
  try {
    logControllerAction('Create Batch', req.user, { body: req.body });
    sanitizeRequest(req);

    // Check teacher profile completeness and course access
    if (!(await canAccessCourse(req, DetailTeacher, Course))) {
      return handleError(
        { name: 'Forbidden', message: 'You must be a teacher with a complete profile.' },
        res,
        'You must be a teacher with a complete profile.'
      );
    }

    const { course, batchName, startDate, days, time, mode, maxStrength, description } = req.body;

    // Check if course exists and belongs to the teacher
    const courseExists = await Course.findOne({ _id: course, teacher: req.user._id });
    if (!courseExists) {
      return handleError(
        { name: 'NotFound', message: 'Course not found or you do not own this course.' },
        res,
        'Course not found or you do not own this course.'
      );
    }

    // Check for duplicate batch name for the same course
    const existingBatch = await Batch.findOne({ course, batchName });
    if (existingBatch) {
      return handleError(
        { name: 'Duplicate', message: 'A batch with this name already exists for this course.' },
        res,
        'A batch with this name already exists for this course.'
      );
    }

    const batch = new Batch({
      course,
      batchName,
      startDate,
      days,
      time,
      mode,
      maxStrength,
      description
    });

    await batch.save();
    sendSuccessResponse(res, batch, 'Batch created successfully', 201);
  } catch (err) {
    handleError(err, res, 'Failed to create batch');
  }
};

// Teacher: Get all batches with students and attendance stats
exports.viewMyBatchesAsTeacher = async (req, res) => {
  try {
    logControllerAction('Get My Batches', req.user);
    
    if (!(await canAccessCourse(req, DetailTeacher, Course))) {
      return handleError(
        { name: 'Forbidden', message: 'You must be a teacher with a complete profile.' },
        res,
        'You must be a teacher with a complete profile.'
      );
    }

    // Pagination
    const page = parseInt(req.query.page) > 0 ? parseInt(req.query.page) : 1;
    const limit = parseInt(req.query.limit) > 0 ? parseInt(req.query.limit) : 10;
    const skip = (page - 1) * limit;

    // Filtering
    const filter = {};
    if (req.query.course) filter.course = req.query.course;
    if (req.query.batchName) filter.batchName = { $regex: req.query.batchName, $options: 'i' };
    if (req.query.mode) filter.mode = req.query.mode;
    if (req.query.startDate) filter.startDate = { $gte: new Date(req.query.startDate) };
    if (req.query.endDate) filter.startDate = { ...filter.startDate, $lte: new Date(req.query.endDate) };

    // Sorting
    // Supports: ?sortBy=duration&sortOrder=desc or ?sortBy=fee&sortOrder=desc for high-to-low
    let sortBy = req.query.sortBy || 'createdAt';
    let sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    let sort = { [sortBy]: sortOrder };
    if ((sortBy === 'duration' || sortBy === 'fee') && sortOrder === -1) {
      // Explicitly sort high to low
      sort = { [sortBy]: -1 };
    }

    // Get batches with course info
    const [batches, total] = await Promise.all([
      Batch.find(filter)
        .populate('course', 'title subtitle')
        .skip(skip)
        .limit(limit)
        .sort(sort),
      Batch.countDocuments(filter)
    ]);

    // Get enrollment and attendance stats for each batch
    const batchesWithStats = await Promise.all(
      batches.map(async (batch) => {
        // Get enrolled students
        const enrolledStudents = await CourseApplication.find({ course: batch.course })
          .populate('student', 'fullname email');

        // Get attendance stats
        const totalAttendanceRecords = await Attendance.countDocuments({ course: batch.course });
        const presentRecords = await Attendance.countDocuments({ 
          course: batch.course, 
          status: 'present' 
        });

        const attendancePercentage = totalAttendanceRecords > 0 
          ? Math.round((presentRecords / totalAttendanceRecords) * 100) 
          : 0;

        return {
          ...batch.toObject(),
          enrolledStudents: enrolledStudents.length,
          attendanceStats: `${presentRecords}/${totalAttendanceRecords} students attended (${attendancePercentage}%)`,
          studentList: enrolledStudents.map(enrollment => ({
            id: enrollment.student._id,
            fullname: enrollment.student.fullname,
            email: enrollment.student.email
          }))
        };
      })
    );

    sendSuccessResponse(res, {
      batches: batchesWithStats,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }, 'Batches retrieved successfully');
  } catch (err) {
    handleError(err, res, 'Failed to retrieve batches');
  }
};

// Teacher: Get specific batch with detailed stats
exports.getBatchById = async (req, res) => {
  try {
    logControllerAction('Get Batch By ID', req.user, { params: req.params });
    if (req.user.role !== 'teacher') {
      return handleError({ name: 'Forbidden', message: 'Only teachers can view batch details.' }, res, 'Only teachers can view batch details.');
    }
    if (!(await canAccessCourse(req, DetailTeacher, Course))) {
      return handleError(
        { name: 'Forbidden', message: 'You must be a teacher with a complete profile.' },
        res,
        'You must be a teacher with a complete profile.'
      );
    }
    const batch = await Batch.findById(req.params.id).populate('course');
    if (!batch) {
      return handleError({ name: 'NotFound' }, res, 'Batch not found');
    }
    if (!isOwner(batch.course, req.user._id)) {
      return handleError({ name: 'Forbidden', message: 'You do not own this batch.' }, res, 'You do not own this batch.');
    }

    // Get enrolled students
    const enrolledStudents = await CourseApplication.find({ course: batch.course })
      .populate('student', 'fullname email');

    // Get detailed attendance stats
    const attendanceStats = await Attendance.aggregate([
      { $match: { course: batch.course } },
      { $group: {
        _id: '$status',
        count: { $sum: 1 }
      }}
    ]);

    const stats = {
      present: 0,
      absent: 0,
      late: 0,
      excused: 0
    };

    attendanceStats.forEach(stat => {
      stats[stat._id] = stat.count;
    });

    const totalAttendance = Object.values(stats).reduce((sum, count) => sum + count, 0);
    const attendancePercentage = totalAttendance > 0 
      ? Math.round((stats.present / totalAttendance) * 100) 
      : 0;

    sendSuccessResponse(res, {
      ...batch.toObject(),
      enrolledStudents: enrolledStudents.length,
      attendanceStats: {
        present: stats.present,
        absent: stats.absent,
        late: stats.late,
        excused: stats.excused,
        total: totalAttendance,
        percentage: attendancePercentage,
        summary: `${stats.present}/${totalAttendance} students attended (${attendancePercentage}%)`
      },
      studentList: enrolledStudents.map(enrollment => ({
        id: enrollment.student._id,
        fullname: enrollment.student.fullname,
        email: enrollment.student.email
      }))
    }, 'Batch details retrieved successfully');
  } catch (err) {
    handleError(err, res, 'Failed to retrieve batch details');
  }
};

// Teacher: Update batch
exports.updateBatch = async (req, res) => {
  try {
    logControllerAction('Update Batch', req.user, { body: req.body, params: req.params });
    sanitizeRequest(req);
    if (req.user.role !== 'teacher') {
      return handleError({ name: 'Forbidden', message: 'Only teachers can update batches.' }, res, 'Only teachers can update batches.');
    }
    if (!(await canAccessCourse(req, DetailTeacher, Course))) {
      return handleError(
        { name: 'Forbidden', message: 'You must be a teacher with a complete profile.' },
        res,
        'You must be a teacher with a complete profile.'
      );
    }
    const batch = await Batch.findById(req.params.id).populate('course');
    if (!batch) {
      return handleError({ name: 'NotFound' }, res, 'Batch not found');
    }
    if (!isOwner(batch.course, req.user._id)) {
      return handleError({ name: 'Forbidden', message: 'You do not own this batch.' }, res, 'You do not own this batch.');
    }
    // Check for duplicate batch name if batchName is being updated
    if (req.body.batchName && req.body.batchName !== batch.batchName) {
      const existingBatch = await Batch.findOne({ 
        course: batch.course, 
        batchName: req.body.batchName,
        _id: { $ne: req.params.id }
      });
      if (existingBatch) {
        return handleError(
          { name: 'Duplicate', message: 'A batch with this name already exists for this course.' },
          res,
          'A batch with this name already exists for this course.'
        );
      }
    }

    Object.assign(batch, req.body);
    await batch.save();

    sendSuccessResponse(res, batch, 'Batch updated successfully');
  } catch (err) {
    handleError(err, res, 'Failed to update batch');
  }
};

// Teacher: Delete batch
exports.deleteBatch = async (req, res) => {
  try {
    logControllerAction('Delete Batch', req.user, { params: req.params });
    sanitizeRequest(req);
    if (req.user.role !== 'teacher') {
      return handleError({ name: 'Forbidden', message: 'Only teachers can delete batches.' }, res, 'Only teachers can delete batches.');
    }
    if (!(await canAccessCourse(req, DetailTeacher, Course))) {
      return handleError(
        { name: 'Forbidden', message: 'You must be a teacher with a complete profile.' },
        res,
        'You must be a teacher with a complete profile.'
      );
    }
    const batch = await Batch.findById(req.params.id).populate('course');
    if (!batch) {
      return handleError({ name: 'NotFound' }, res, 'Batch not found');
    }
    if (!isOwner(batch.course, req.user._id)) {
      return handleError({ name: 'Forbidden', message: 'You do not own this batch.' }, res, 'You do not own this batch.');
    }
    // Check if there are any enrolled students
    const enrolledStudents = await CourseApplication.countDocuments({ course: batch.course });
    if (enrolledStudents > 0) {
      return handleError(
        { name: 'Forbidden', message: 'Cannot delete batch with enrolled students.' },
        res,
        'Cannot delete batch with enrolled students. Please unenroll all students first.'
      );
    }

    await batch.deleteOne();
    sendSuccessResponse(res, null, 'Batch deleted successfully');
  } catch (err) {
    handleError(err, res, 'Failed to delete batch');
  }
};

// Teacher: View students in a specific batch
exports.viewStudentsInBatch = async (req, res) => {
  try {
    logControllerAction('View Students In Batch', req.user, { params: req.params });
    if (req.user.role !== 'teacher') {
      return handleError({ name: 'Forbidden', message: 'Only teachers can view students in batch.' }, res, 'Only teachers can view students in batch.');
    }
    if (!(await canAccessCourse(req, DetailTeacher, Course))) {
      return handleError(
        { name: 'Forbidden', message: 'You must be a teacher with a complete profile.' },
        res,
        'You must be a teacher with a complete profile.'
      );
    }
    const batch = await Batch.findById(req.params.id).populate('course');
    if (!batch) {
      return handleError({ name: 'NotFound' }, res, 'Batch not found');
    }
    if (!isOwner(batch.course, req.user._id)) {
      return handleError({ name: 'Forbidden', message: 'You do not own this batch.' }, res, 'You do not own this batch.');
    }

    // Pagination
    const page = parseInt(req.query.page) > 0 ? parseInt(req.query.page) : 1;
    const limit = parseInt(req.query.limit) > 0 ? parseInt(req.query.limit) : 10;
    const skip = (page - 1) * limit;

    // Get enrolled students with attendance stats
    const [enrollments, total] = await Promise.all([
      CourseApplication.find({ course: batch.course })
        .populate('student', 'fullname email')
        .skip(skip)
        .limit(limit),
      CourseApplication.countDocuments({ course: batch.course })
    ]);

    // Get attendance stats for each student
    const studentsWithStats = await Promise.all(
      enrollments.map(async (enrollment) => {
        const studentAttendance = await Attendance.find({ 
          course: batch.course, 
          student: enrollment.student._id 
        });

        const totalClasses = studentAttendance.length;
        const presentClasses = studentAttendance.filter(a => a.status === 'present').length;
        const attendancePercentage = totalClasses > 0 
          ? Math.round((presentClasses / totalClasses) * 100) 
          : 0;

        return {
          student: enrollment.student,
          enrollmentDate: enrollment.appliedAt,
          attendanceStats: {
            totalClasses,
            presentClasses,
            absentClasses: studentAttendance.filter(a => a.status === 'absent').length,
            lateClasses: studentAttendance.filter(a => a.status === 'late').length,
            excusedClasses: studentAttendance.filter(a => a.status === 'excused').length,
            attendancePercentage,
            summary: `${presentClasses}/${totalClasses} classes attended (${attendancePercentage}%)`
          }
        };
      })
    );

    sendSuccessResponse(res, {
      batch: {
        id: batch._id,
        batchName: batch.batchName,
        course: batch.course
      },
      students: studentsWithStats,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }, 'Students in batch retrieved successfully');
  } catch (err) {
    handleError(err, res, 'Failed to retrieve students in batch');
  }
};

// STUDENT: View available batches for a course
exports.viewAvailableBatches = async (req, res) => {
  try {
    const { course } = req.query;
    if (!course) {
      return handleError({ name: 'ValidationError' }, res, 'Course ID is required');
    }
    // Sorting
    // Supports: ?sortBy=duration&sortOrder=desc or ?sortBy=fee&sortOrder=desc for high-to-low
    let sortBy = req.query.sortBy || 'createdAt';
    let sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    let sort = { [sortBy]: sortOrder };
    if ((sortBy === 'duration' || sortBy === 'fee') && sortOrder === -1) {
      // Explicitly sort high to low
      sort = { [sortBy]: -1 };
    }
    // Get all batches for the course
    const batches = await Batch.find({ course })
      .select('batchName startDate days time mode maxStrength currentStrength description')
      .sort(sort);
    sendSuccessResponse(res, batches, 'Available batches retrieved');
  } catch (err) {
    handleError(err, res, 'Failed to retrieve available batches');
  }
};

// STUDENT: Enroll in a batch
exports.enrollInBatch = async (req, res) => {
  try {
    const { batch: batchId } = req.body;
    const studentId = req.user._id;
    if (!batchId) {
      return handleError({ name: 'ValidationError' }, res, 'Batch ID is required');
    }
    const batch = await Batch.findById(batchId).populate('course');
    if (!batch) {
      return handleError({ name: 'NotFound' }, res, 'Batch not found');
    }
    // Check if batch is full
    if (batch.currentStrength >= batch.maxStrength) {
      return handleError({ name: 'Forbidden' }, res, 'Batch is full');
    }
    // Check if already enrolled in another batch for the same course
    const alreadyEnrolled = await BatchEnrollment.findOne({
      student: studentId,
      batch: { $ne: batchId }
    }).populate('batch');
    if (alreadyEnrolled && alreadyEnrolled.batch.course.toString() === batch.course._id.toString()) {
      return handleError({ name: 'Forbidden' }, res, 'Already enrolled in another batch for this course');
    }
    // Check if already enrolled in a batch with the same timing (across all courses)
    const sameTimeBatch = await BatchEnrollment.findOne({ student: studentId })
      .populate('batch');
    if (sameTimeBatch && sameTimeBatch.batch.time === batch.time) {
      return handleError({ name: 'Forbidden' }, res, 'Already enrolled in a batch with the same timing');
    }
    // Enroll
    await BatchEnrollment.create({ batch: batchId, student: studentId });
    batch.currentStrength += 1;
    await batch.save();
    sendSuccessResponse(res, { batchId, currentStrength: batch.currentStrength, maxStrength: batch.maxStrength }, 'Enrolled in batch successfully', 201);
  } catch (err) {
    if (err.code === 11000) {
      return handleError({ name: 'Duplicate', message: 'Already enrolled in this batch' }, res, 'Already enrolled in this batch');
    }
    handleError(err, res, 'Failed to enroll in batch');
  }
};

// STUDENT: View enrolled batch(es)
exports.viewMyBatchesAsStudent = async (req, res) => {
  try {
    const studentId = req.user._id;
    const enrollments = await BatchEnrollment.find({ student: studentId })
      .populate({
        path: 'batch',
        populate: { path: 'course', select: 'title' }
      });
    sendSuccessResponse(res, enrollments, 'Enrolled batches retrieved');
  } catch (err) {
    handleError(err, res, 'Failed to retrieve enrolled batches');
  }
};

// TEACHER: Unenroll a student from a batch
exports.unenrollStudentFromBatch = async (req, res) => {
  try {
    const { batchId, studentId } = req.body;
    if (!batchId || !studentId) {
      return handleError({ name: 'ValidationError' }, res, 'Batch ID and Student ID are required');
    }
    const batch = await Batch.findById(batchId);
    if (!batch) {
      return handleError({ name: 'NotFound' }, res, 'Batch not found');
    }
    // Only the teacher who owns the course can unenroll
    const course = await Course.findOne({ _id: batch.course, teacher: req.user._id });
    if (!course) {
      return handleError({ name: 'Forbidden' }, res, 'You do not own this batch');
    }
    // Remove enrollment
    const result = await BatchEnrollment.findOneAndDelete({ batch: batchId, student: studentId });
    if (!result) {
      return handleError({ name: 'NotFound' }, res, 'Student not enrolled in this batch');
    }
    batch.currentStrength = Math.max(0, batch.currentStrength - 1);
    await batch.save();
    sendSuccessResponse(res, null, 'Student unenrolled from batch successfully');
  } catch (err) {
    handleError(err, res, 'Failed to unenroll student from batch');
  }
};
