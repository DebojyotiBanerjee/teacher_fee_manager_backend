const Course = require('../models/course.models');
const DetailTeacher = require('../models/detailTeacher.models');
const { isTeacherProfileComplete } = require('./detailTeacher.controller');
const { sanitizeRequest } = require('../utils/sanitizer');
const { handleError, sendSuccessResponse, logControllerAction } = require('../utils/controllerUtils');

// Helper to check teacher role
function checkTeacherRole(req, res) {
  if (!req.user || req.user.role !== 'teacher') {
    res.status(403).json({ success: false, message: 'Access denied. Only teachers can perform this action.' });
    return false;
  }
  return true;
}

// Helper to check if teacher has a complete profile using the shared function
async function checkTeacherProfileComplete(req, res) {
  const detail = await DetailTeacher.findOne({ user: req.user._id });
  if (!detail || !isTeacherProfileComplete(detail)) {
    res.status(403).json({ success: false, message: 'You must complete your teacher profile before managing courses.' });
    return false;
  }
  return true;
}

// Create a new course
exports.createCourse = async (req, res) => {
  logControllerAction('Create Course', req.user, { body: req.body });
  sanitizeRequest(req);
  if (!checkTeacherRole(req, res)) return;
  if (!(await checkTeacherProfileComplete(req, res))) return;
  try {
    // Prevent duplicate course for the same teacher
    const existingCourse = await Course.findOne({ teacher: req.user._id });
    if (existingCourse) {
      return handleError({ name: 'Duplicate', message: 'A course already exists for this teacher.' }, res, 'A course already exists for this teacher.');
    }
    const course = new Course({
      ...req.body,
      teacher: req.user._id
    });
    await course.save();
    sendSuccessResponse(res, course, 'Course created successfully', 201);
  } catch (err) {
    handleError(err, res, 'Failed to create course');
  }
};

// Get all courses
exports.getCourses = async (req, res) => {
  logControllerAction('Get Courses', req.user);
  if (!checkTeacherRole(req, res)) return;
  if (!(await checkTeacherProfileComplete(req, res))) return;
  try {
    const courses = await Course.find().populate('teacher', 'fullname email');
    sendSuccessResponse(res, courses, 'Courses retrieved successfully');
  } catch (err) {
    handleError(err, res, 'Failed to retrieve courses');
  }
};

// Get a single course by ID
exports.getCourseById = async (req, res) => {
  logControllerAction('Get Course By ID', req.user, { params: req.params });
  if (!checkTeacherRole(req, res)) return;
  if (!(await checkTeacherProfileComplete(req, res))) return;
  try {
    const course = await Course.findById(req.params.id).populate('teacher', 'fullname email');
    if (!course) {
      return handleError({ name: 'NotFound' }, res, 'Course not found');
    }
    sendSuccessResponse(res, course, 'Course retrieved successfully');
  } catch (err) {
    handleError(err, res, 'Failed to retrieve course');
  }
};

// Update a course by ID
exports.updateCourse = async (req, res) => {
  logControllerAction('Update Course', req.user, { body: req.body, params: req.params });
  sanitizeRequest(req);
  if (!checkTeacherRole(req, res)) return;
  if (!(await checkTeacherProfileComplete(req, res))) return;
  try {
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('teacher', 'fullname email');
    if (!course) {
      return handleError({ name: 'NotFound' }, res, 'Course not found');
    }
    sendSuccessResponse(res, course, 'Course updated successfully');
  } catch (err) {
    handleError(err, res, 'Failed to update course');
  }
};

// Delete a course by ID
exports.deleteCourse = async (req, res) => {
  logControllerAction('Delete Course', req.user, { params: req.params });
  if (!checkTeacherRole(req, res)) return;
  if (!(await checkTeacherProfileComplete(req, res))) return;
  try {
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) {
      return handleError({ name: 'NotFound' }, res, 'Course not found');
    }
    sendSuccessResponse(res, null, 'Course deleted successfully');
  } catch (err) {
    handleError(err, res, 'Failed to delete course');
  }
}; 