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
router.get('/course/my', authenticateTeacher, courseController.getMyCourse);
router.get('/course/:id', authenticateTeacher, courseController.getMyCourseById);
router.delete('/course/:id', authenticateTeacher, courseController.deleteCourse);

// Attendance Management Routes
router.post('/attendance/mark', authenticateTeacher, Attendance, validator, attendanceController.markAttendance);
router.get('/attendance', authenticateTeacher, attendanceController.viewAttendance);

router.get('/course-application', authenticateTeacher, courseApplicationController.viewCourseApplication);

module.exports = router;
