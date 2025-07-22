const Attendance = require('../models/attendance.models');
const DetailTeacher = require('../models/detailTeacher.models');
const Batch = require('../models/batch.models');
const Course = require('../models/course.models');
const { handleError, sendSuccessResponse, canAccessCourse } = require('../utils/controllerUtils');

// POST /teacher/attendance/mark
exports.markAttendance = async (req, res) => {
  try {
    // Check teacher profile completeness
    if (!(await canAccessCourse(req, DetailTeacher, Course))) {
      return handleError(
        { name: 'Forbidden', message: 'You must be a teacher with a complete profile.' },
        res,
        'You must be a teacher with a complete profile.'
      );
    }

    const { batch, date, attendance } = req.body; // attendance: [{ student, status, notes }]
    if (!batch || !date || !Array.isArray(attendance)) {
      return handleError({ name: 'ValidationError' }, res, 'Missing required fields');
    }

    // Check if batch exists and teacher owns the batch's course
    const batchDoc = await Batch.findById(batch).populate('course');
    if (!batchDoc) {
      return handleError({ name: 'NotFound' }, res, 'Batch not found');
    }
    const course = await Course.findOne({ _id: batchDoc.course, teacher: req.user._id });
    if (!course) {
      return handleError({ name: 'Forbidden', message: 'You do not own this batch.' }, res, 'You do not own this batch.');
    }

    // Create attendance records
    const records = await Promise.all(attendance.map(async (entry) => {
      return Attendance.create({
        teacherDetailId: req.user._id,
        batch,
        course: batchDoc.course, // for reference
        student: entry.student,
        date,
        status: entry.status,
        notes: entry.notes || ''
      });
    }));

    sendSuccessResponse(res, records, 'Attendance marked successfully', 201);
  } catch (err) {
    handleError(err, res, 'Failed to mark attendance');
  }
};

// GET /teacher/attendance?batch=<batchId>&date=<date>
exports.viewAttendance = async (req, res) => {
  try {
    if (!(await canAccessCourse(req, DetailTeacher, Course))) {
      return handleError(
        { name: 'Forbidden', message: 'You must be a teacher with a complete profile.' },
        res,
        'You must be a teacher with a complete profile.'
      );
    }

    const { batch, date, startDate, endDate, status, student, page = 1, limit = 10, sortBy = 'date', sortOrder = 'desc' } = req.query;
    if (!batch) {
      return handleError({ name: 'ValidationError' }, res, 'Batch ID is required');
    }

    // Pagination
    const pageNum = parseInt(page) > 0 ? parseInt(page) : 1;
    const limitNum = parseInt(limit) > 0 ? parseInt(limit) : 10;
    const skip = (pageNum - 1) * limitNum;

    // Build query
    const query = { batch };
    if (date) query.date = new Date(date);
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    if (status) query.status = status;
    if (student) query.student = student;

    // Sorting
    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    const sort = { [sortBy]: sortDirection };

    // Populate student and batch info
    const [records, total] = await Promise.all([
      Attendance.find(query)
        .populate('student', 'fullname email')
        .populate('batch', 'batchName')
        .populate('teacherDetailId', 'user')
        .skip(skip)
        .limit(limitNum)
        .sort(sort),
      Attendance.countDocuments(query)
    ]);

    sendSuccessResponse(res, {
      records,
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum)
    }, 'Attendance records retrieved');
  } catch (err) {
    handleError(err, res, 'Failed to retrieve attendance');
  }
};

// GET /student/attendance?batch=<batchId>&date=<date>
exports.viewStudentAttendance = async (req, res) => {
  try {
    // Check if user is a student
    if (!req.user || req.user.role !== 'student') {
      return handleError(
        { name: 'Forbidden', message: 'Only students can view their attendance.' },
        res,
        'Only students can view their attendance.'
      );
    }

    const { batch, date, startDate, endDate, status, page = 1, limit = 10, sortBy = 'date', sortOrder = 'desc' } = req.query;
    if (!batch) {
      return handleError({ name: 'ValidationError' }, res, 'Batch ID is required');
    }

    // Pagination
    const pageNum = parseInt(page) > 0 ? parseInt(page) : 1;
    const limitNum = parseInt(limit) > 0 ? parseInt(limit) : 10;
    const skip = (pageNum - 1) * limitNum;

    // Build query - student can only see their own attendance
    const query = { 
      batch,
      student: req.user._id
    };
    if (date) query.date = new Date(date);
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    if (status) query.status = status;

    // Sorting
    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    const sort = { [sortBy]: sortDirection };

    // Populate batch info
    const [records, total] = await Promise.all([
      Attendance.find(query)
        .populate('batch', 'batchName')
        .populate('teacherDetailId', 'user')
        .select('date status notes batch teacherDetailId') 
        .skip(skip)
        .limit(limitNum)
        .sort(sort),
      Attendance.countDocuments(query)
    ]);

    sendSuccessResponse(res, {
      records,
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum)
    }, 'Attendance records retrieved');
  } catch (err) {
    handleError(err, res, 'Failed to retrieve attendance');
  }
};
