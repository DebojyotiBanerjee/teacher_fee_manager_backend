const express = require('express');
const router = express.Router();
const detailTeacherController = require('../controller/detailTeacher.controller');
const { detailTeacherValidator, batchValidator } = require('../validators/teacher.validator');
const { Attendance } = require('../validators/attendance.validator');
const validator = require('../middleware/validator.middleware');
const { 
  authenticateTeacher
} = require('../middleware/auth.middleware');
const { sanitizeInput } = require('../middleware/sanitizer.middleware');
const teacherEnrollController = require('../controller/teacherEnroll.controller');

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
router.get('/batch', authenticateTeacher, teacherEnrollController.getTeacherBatches);
router.post('/batch', authenticateTeacher, batchValidator, validator, teacherEnrollController.createBatch);
router.put('/batch/', authenticateTeacher, batchValidator, validator, teacherEnrollController.updateBatch);
router.delete('/batch/', authenticateTeacher, teacherEnrollController.deleteBatch);

// View Batches and Students
router.get('/view-batches', authenticateTeacher, teacherEnrollController.viewMyBatches);
router.get('/view-batch/students', authenticateTeacher, teacherEnrollController.viewStudentsInBatch);

// Attendance Management Routes
router.post('/attendance/mark', authenticateTeacher, Attendance, validator, teacherEnrollController.markAttendance);
router.get('/attendance/student', authenticateTeacher, teacherEnrollController.getStudentAttendance);

module.exports = router;
