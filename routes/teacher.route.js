const express = require('express');
const router = express.Router();
const detailTeacherController = require('../controller/detailTeacher.controller');
const { detailTeacherValidator, batchValidator, CourseValidator } = require('../validators/teacher.validator');
const { Attendance } = require('../validators/attendance.validator');
const validator = require('../middleware/validator.middleware');
const {
  authenticateTeacher
} = require('../middleware/auth.middleware');
const { sanitizeInput } = require('../middleware/sanitizer.middleware');
const batchController = require('../controller/batch.controller');
const courseController = require('../controller/course.controller');
const attendanceController = require('../controller/attendence.controller');
const courseApplicationController = require('../controller/courseApplication.controller');

// Test route to check if teacher routes are working
router.get('/test', (req, res) => {
  console.log('Teacher test route hit');
  res.json({
    success: true,
    message: 'Teacher routes are working',
    timestamp: new Date().toISOString()
  });
});

// Teacher Dashboard
router.get('/dashboard', authenticateTeacher, detailTeacherController.teacherDashboard);

// Teacher Detail Management
router.post('/detail', authenticateTeacher, sanitizeInput, detailTeacherValidator, validator, detailTeacherController.createDetailTeacher);
router.get('/detail', authenticateTeacher, detailTeacherController.getDetailTeacherById);
router.put('/detail', authenticateTeacher, sanitizeInput, detailTeacherValidator, validator, detailTeacherController.updateDetailTeacher);
router.delete('/detail', authenticateTeacher, detailTeacherController.deleteDetailTeacher);

// Batch Management Routes
router.get('/batch', authenticateTeacher, batchController.viewMyBatchesAsTeacher);
router.post('/batch', authenticateTeacher, batchValidator, validator, batchController.createBatch);
router.get('/batch/:id', authenticateTeacher, batchController.getBatchById);
router.put('/batch/:id', authenticateTeacher, batchValidator, validator, batchController.updateBatch);
router.delete('/batch/:id', authenticateTeacher, batchController.deleteBatch);

// View Students in Batch
router.get('/batch/:id/students', authenticateTeacher, batchController.viewStudentsInBatch);

// Teacher Unenroll Student from Batch
router.post('/batch/unenroll', authenticateTeacher, batchController.unenrollStudentFromBatch);

// Course Management Routes
router.post('/course', authenticateTeacher, CourseValidator, validator, courseController.createCourse);
router.put('/course/:id', authenticateTeacher, CourseValidator, validator, courseController.updateCourse);
router.get('/course/my-courses', authenticateTeacher, courseController.getMyCourse);
router.get('/course/:id', authenticateTeacher, courseController.getMyCourseById);
router.delete('/course/:id', authenticateTeacher, courseController.deleteCourse);

// Attendance Management Routes
router.post('/attendance/mark', authenticateTeacher, Attendance, validator, attendanceController.markAttendance);
router.get('/attendance', authenticateTeacher, attendanceController.viewAttendance);

router.get('/course-application', authenticateTeacher, courseApplicationController.viewCourseApplication);

// Debug route to check all batches
router.get('/debug/batches', authenticateTeacher, async (req, res) => {
  try {
    const Batch = require('../models/batch.models');
    const Course = require('../models/course.models');
    
    // Get all batches
    const allBatches = await Batch.find({ isDeleted: false })
      .populate('course', 'title')
      .select('batchName course startDate days time mode maxStrength currentStrength description');
    
    // Get teacher's courses
    const teacherCourses = await Course.find({ 
      teacher: req.user._id, 
      isDeleted: false 
    }).select('_id title');
    
    res.json({
      success: true,
      data: {
        allBatches,
        teacherCourses,
        teacherId: req.user._id
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Error fetching debug data',
      error: err.message
    });
  }
});

// Helper route to update batch course IDs
router.put('/debug/update-batch-course', authenticateTeacher, async (req, res) => {
  try {
    const { batchId, newCourseId } = req.body;
    const Batch = require('../models/batch.models');
    
    if (!batchId || !newCourseId) {
      return res.status(400).json({
        success: false,
        message: 'Batch ID and new course ID are required'
      });
    }
    
    const updatedBatch = await Batch.findByIdAndUpdate(
      batchId,
      { course: newCourseId },
      { new: true }
    );
    
    if (!updatedBatch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Batch course updated successfully',
      data: updatedBatch
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Error updating batch course',
      error: err.message
    });
  }
});

module.exports = router;
