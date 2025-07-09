const express = require('express');
const router = express.Router();
const studentFlowController = require('../controller/studentFlow.controller');
const authMiddleware = require('../middleware/auth.middleware');

// 1. View available batches (filtered) - No auth required for browsing
router.get('/batches', studentFlowController.getAvailableBatches);

// 2. Apply/Enroll in a batch - Requires student authentication
router.post('/batches/:batchId/apply', authMiddleware.authenticateStudent, studentFlowController.applyToBatch);

// 3. Get student's enrolled batches - Requires student authentication
router.get('/my-batches', authMiddleware.authenticateStudent, studentFlowController.getMyBatches);

// 4. Get specific enrollment details - Requires student authentication
router.get('/batches/:batchId/enrollment', authMiddleware.authenticateStudent, studentFlowController.getEnrollmentDetails);

// 5. Teacher approval endpoints (requires teacher role)
router.post('/approve-enrollment', authMiddleware.authenticateTeacher, studentFlowController.approveEnrollment);

// 6. Attendance management (requires teacher role)
router.post('/update-attendance', authMiddleware.authenticateTeacher, studentFlowController.updateAttendance);

// 7. Fee management (requires teacher role)
router.post('/mark-fee-paid', authMiddleware.authenticateTeacher, studentFlowController.markFeePaid);

module.exports = router; 