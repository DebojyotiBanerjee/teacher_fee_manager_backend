const Batch = require('../models/batch.models');
const Course = require('../models/course.models');
const DetailTeacher = require('../models/detailTeacher.models');
const CourseApplication = require('../models/courseApplication.models');
const Attendance = require('../models/attendance.models');
const BatchEnrollment = require('../models/batchEnrollment.models');

const { handleError, sendSuccessResponse, canAccessCourse, logControllerAction, isOwner, softDelete } = require('../utils/controllerUtils');
const { sanitizeRequest } = require('../utils/sanitizer');

// Teacher: Create batch
exports.createBatch = async (req, res) => {
  try {
    logControllerAction('Create Batch', req.user, { body: req.body });
    sanitizeRequest(req);

    // Destructure request body for clear testing
    const { course, batchName, startDate, days, time, mode, maxStrength, description } = req.body;

    // Check teacher profile completeness and course access
    if (!(await canAccessCourse(req, DetailTeacher, Course))) {
      return handleError(
        { name: 'Forbidden', message: 'You must be a teacher with a complete profile.' },
        res,
        'You must be a teacher with a complete profile.'
      );
    }

    // Check if course exists and belongs to the teacher
    const courseExists = await Course.findOne({ _id: course, teacher: req.user._id });
    if (!courseExists) {
      return handleError(
        { name: 'NotFound', message: 'Course not found or you do not own this course.' },
        res,
        'Course not found or you do not own this course.'
      );
    }

    // Check for duplicate batch name for the same course (excluding soft deleted)
    const existingBatch = await Batch.findOne({ course, batchName, isDeleted: { $ne: true } });
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

    // Get teacher's courses first
    const teacherCourses = await Course.find({ teacher: req.user._id, isDeleted: false }).select('_id');
    const teacherCourseIds = teacherCourses.map(course => course._id);

    // Filtering - only show batches for teacher's courses
    const filter = { 
      isDeleted: false,
      course: { $in: teacherCourseIds } // Only batches for teacher's courses
    };
    if (req.query.course) {
      // Additional check to ensure the requested course belongs to the teacher
      if (!teacherCourseIds.includes(req.query.course)) {
        return handleError(
          { name: 'Forbidden', message: 'You can only view batches for your own courses.' },
          res,
          'You can only view batches for your own courses.'
        );
      }
      filter.course = req.query.course;
    }
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
    const batch = await Batch.findOne({ _id: req.params.id, isDeleted: false }).populate('course');
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
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
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

//get batch details for students
exports.getMyBatchById = async (req, res) => {
  try {
    logControllerAction('Get My Batch By ID', req.user, { params: req.params });

    const batch = await Batch.findOne({ _id: req.params.id, isDeleted: false }).populate('course');

    if (!batch) {
      return handleError({ name: 'NotFound' }, res, "Batch not Found");
    }

    sendSuccessResponse(res, {
      batch
    }, "Batch Details retrieved successfully")
  }catch(err){
    handleError(err,res,"Failed to retrieve batch details")
  }
}

// Teacher: Update batch
exports.updateBatch = async (req, res) => {
  try {
    logControllerAction('Update Batch', req.user, { body: req.body, params: req.params });
    sanitizeRequest(req);

    // Destructure request body for clear testing
    const { course, batchName, startDate, days, time, mode, maxStrength, description } = req.body;

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
    const batch = await Batch.findOne({ _id: req.params.id, isDeleted: false }).populate('course');
    if (!batch) {
      return handleError({ name: 'NotFound' }, res, 'Batch not found or has been deleted');
    }
    if (!isOwner(batch.course, req.user._id)) {
      return handleError({ name: 'Forbidden', message: 'You do not own this batch.' }, res, 'You do not own this batch.');
    }
    // Check for duplicate batch name if batchName is being updated
    if (batchName && batchName !== batch.batchName) {
      const existingBatch = await Batch.findOne({
        course: batch.course,
        batchName,
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

    const updateData = {
      course, batchName, startDate, days, time, mode, maxStrength, description
    };
    Object.assign(batch, updateData);
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
    const batch = await Batch.findOne({ _id: req.params.id, isDeleted: false }).populate('course');
    if (!batch) {
      return handleError({ name: 'NotFound' }, res, 'Batch not found or has been deleted');
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

    const deletedBatch = await softDelete(Batch, { _id: req.params.id });
    if (!deletedBatch) {
      return handleError({ name: 'NotFound' }, res, 'Batch not found');
    }
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
    const batch = await Batch.findOne({ _id: req.params.id, isDeleted: false }).populate('course');
    if (!batch) {
      return handleError({ name: 'NotFound' }, res, 'Batch not found or has been deleted');
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
      BatchEnrollment.find({ batch: req.params.id })
        .populate('student', 'fullname email')
        .skip(skip)
        .limit(limit),
      BatchEnrollment.countDocuments({ batch: req.params.id })
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
          enrollmentDate: enrollment.enrolledAt,
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
    const batches = await Batch.find({ course, isDeleted: false })
      .select('batchName startDate days time mode maxStrength currentStrength description')
      .sort(sort);
    sendSuccessResponse(res, batches, 'Available batches retrieved');
  } catch (err) {
    handleError(err, res, 'Failed to retrieve available batches');
  }
};



// STUDENT: View enrolled batch(es)
exports.viewMyBatchesAsStudent = async (req, res) => {
  try {
    const studentId = req.user._id;
    const enrollments = await BatchEnrollment.find({ student: studentId })
      .populate({
        path: 'batch',
        match: { isDeleted: false }, // Only populate non-deleted batches
        populate: { path: 'course', select: 'title' }
      });

    // Filter out enrollments where batch is null (deleted batches)
    const validEnrollments = enrollments.filter(enrollment => enrollment.batch !== null);

    sendSuccessResponse(res, validEnrollments, 'Enrolled batches retrieved');
  } catch (err) {
    handleError(err, res, 'Failed to retrieve enrolled batches');
  }
};


