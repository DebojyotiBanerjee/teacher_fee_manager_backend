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
const teacherEnrollController = require('../controller/teacherEnroll.controller');
const courseController = require('../controller/course.controller');
const { authenticateStudent } = require('../middleware/auth.middleware');

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
router.get('/batch', authenticateTeacher, teacherEnrollController.viewMyBatches);
router.post('/batch', authenticateTeacher, batchValidator, validator, teacherEnrollController.createBatch);
router.put('/batch/', authenticateTeacher, batchValidator, validator, teacherEnrollController.updateBatch);
router.delete('/batch/', authenticateTeacher, teacherEnrollController.deleteBatch);

// View Batches and Students
router.get('/view-batch/students', authenticateTeacher, teacherEnrollController.viewStudentsInBatch);

// Attendance Management Routes
router.post('/attendance/mark', authenticateTeacher, Attendance, validator, teacherEnrollController.markAttendance);

// Course Management Routes
router.post('/course', authenticateTeacher, CourseValidator, validator, courseController.createCourse);
router.put('/course/:id', authenticateTeacher, CourseValidator, validator, courseController.updateCourse);
router.get('/course/my', authenticateTeacher, courseController.getMyCourse);
router.get('/course/:id', authenticateTeacher, courseController.getMyCourseById);
router.delete('/course/:id', authenticateTeacher, courseController.deleteCourse);




module.exports = router;
