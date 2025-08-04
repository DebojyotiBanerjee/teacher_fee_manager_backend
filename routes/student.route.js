const express = require('express');
const router = express.Router();
const detailStudentController = require('../controller/detailStudent.controller');
const { DetailStudent } = require('../validators/student.validator');
const validator = require('../middleware/validator.middleware');
const { 
  authenticateStudent
} = require('../middleware/auth.middleware');
const { sanitizeInput } = require('../middleware/sanitizer.middleware');
const courseController = require('../controller/course.controller');
const attendanceController = require('../controller/attendence.controller');
const batchController = require('../controller/batch.controller');

// Student Dashboard
router.get('/dashboard', authenticateStudent, detailStudentController.studentDashboard);

// Student Detail Management
router.post('/detail', authenticateStudent, sanitizeInput, DetailStudent, validator, detailStudentController.createDetailStudent);
router.get('/detail', authenticateStudent, detailStudentController.getDetailStudentById);
router.put('/detail', authenticateStudent, sanitizeInput, DetailStudent, validator, detailStudentController.updateDetailStudent);
router.delete('/detail', authenticateStudent, detailStudentController.deleteDetailStudent);

// Student Course Access
router.get('/courses',authenticateStudent, courseController.getAllCourses);
router.get('/courses/:id', authenticateStudent, courseController.getCourseById);
router.post('/course/:id/enroll', authenticateStudent, courseController.enrollInCourse);


// Student Attendance Routes
router.get('/attendance', authenticateStudent, attendanceController.viewStudentAttendance);

// Student Batch Access
router.get('/batches/available', authenticateStudent, batchController.viewAvailableBatches);
router.post('/batch/enroll', authenticateStudent, batchController.enrollInBatch);
router.get('/batch/my', authenticateStudent, batchController.viewMyBatchesAsStudent);

module.exports = router;
