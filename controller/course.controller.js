const Course = require('../models/course.models');
const DetailTeacher = require('../models/detailTeacher.models');

// Helper to check teacher role
function checkTeacherRole(req, res) {
  if (!req.user || req.user.role !== 'teacher') {
    res.status(403).json({ success: false, message: 'Access denied. Only teachers can perform this action.' });
    return false;
  }
  return true;
}

// Helper to check if teacher has a complete profile
async function checkTeacherProfileComplete(req, res) {
  const detail = await DetailTeacher.findOne({ user: req.user._id });
  if (!detail || !detail.isProfileComplete) {
    res.status(403).json({ success: false, message: 'You must complete your teacher profile before managing courses.' });
    return false;
  }
  return true;
}

// Create a new course
exports.createCourse = async (req, res) => {
  if (!checkTeacherRole(req, res)) return;
  if (!(await checkTeacherProfileComplete(req, res))) return;
  try {
    const course = new Course(req.body);
    await course.save();
    res.status(201).json({ success: true, data: course });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// Get all courses
exports.getCourses = async (req, res) => {
  if (!checkTeacherRole(req, res)) return;
  if (!(await checkTeacherProfileComplete(req, res))) return;
  try {
    const courses = await Course.find().populate('teacherName', 'fullname email');
    res.json({ success: true, data: courses });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get a single course by ID
exports.getCourseById = async (req, res) => {
  if (!checkTeacherRole(req, res)) return;
  if (!(await checkTeacherProfileComplete(req, res))) return;
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }
    res.json({ success: true, data: course });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// Update a course by ID
exports.updateCourse = async (req, res) => {
  if (!checkTeacherRole(req, res)) return;
  if (!(await checkTeacherProfileComplete(req, res))) return;
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!course) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }
    res.json({ success: true, data: course });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// Delete a course by ID
exports.deleteCourse = async (req, res) => {
  if (!checkTeacherRole(req, res)) return;
  if (!(await checkTeacherProfileComplete(req, res))) return;
  try {
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }
    res.json({ success: true, message: 'Course deleted successfully' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}; 