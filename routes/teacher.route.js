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
const teacherStatsController = require('../controller/teacherStats.controller');
const batchEnrollmentController= require('../controller/batchEnrollment.controller')

const {feeQRCodeValidator} = require('../validators/fee.validator')

const feeController = require('../controller/fee.controller');
const { uploadQRCode } = require('../middleware/fileUpload.middleware');
const { teacherExpenseValidator } = require('../validators/teacherExpense.validator');
const teacherExpenseController = require('../controller/teacherExpense.controller');



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
router.post('/batch/unenroll', authenticateTeacher, batchEnrollmentController.unenrollStudentFromBatch);

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

router.get('/course-application/:studentId', authenticateTeacher, courseApplicationController.viewCourseApplicationById);



// Payment History for Teacher
router.get('/payment/history', authenticateTeacher, feeController.getTeacherPaymentHistory);

// Get Teacher Statistics with Charts
router.get('/stats', authenticateTeacher, teacherStatsController.getTeacherStats);

// Only teachers can create, update, get, delete their QR code
router.post('/qr-create', authenticateTeacher, uploadQRCode(), feeController.createQRCode);
router.get('/qr-get', authenticateTeacher, feeController.getQRCode);
router.put('/qr-update', authenticateTeacher, feeQRCodeValidator, feeController.updateQRCode);
router.delete('/qr-delete', authenticateTeacher, feeController.deleteQRCode);

// Offline payment management routes
router.post('/offline-payment', authenticateTeacher, sanitizeInput,validator, feeController.createOfflinePayment);
// get all the offline payments
router.get('/offline-payments', authenticateTeacher, validator,feeController.getOfflinePayments
);

//get offline payments of a particular course
// router.get('/offline-payments/:courseId', authenticateTeacher, validator, feeController.getOfflinePaymentsByCourseId)

router.delete('/offline-payment/:paymentId', authenticateTeacher, validator, feeController.deleteOfflinePayment);

// Create expense
router.post('/expense', authenticateTeacher, teacherExpenseValidator, validator, teacherExpenseController.createExpense);

// Get all expenses with optional filters
router.get('/expense', authenticateTeacher, teacherExpenseController.getExpenses);

// Get expense summary
router.get('/expense/summary', authenticateTeacher, teacherExpenseController.getExpenseSummary);

// Get specific expense
router.get('/expense/:expenseId', authenticateTeacher, teacherExpenseController.getExpenseById);

// Update expense
router.put('/expense/:expenseId', authenticateTeacher, teacherExpenseValidator, validator, teacherExpenseController.updateExpense);

// Delete expense
router.delete('/expense/:expenseId', authenticateTeacher, teacherExpenseController.deleteExpense);

module.exports = router;
