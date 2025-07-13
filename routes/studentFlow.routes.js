const express = require('express');
const router = express.Router();
const studentFlowController = require('../controller/studentFlow.controller');
const authMiddleware = require('../middleware/auth.middleware');
const validator = require('../middleware/validator.middleware');
const {
  getAvailableBatchesValidator,
  applyToBatchValidator,
  approveEnrollmentValidator,
  updateAttendanceValidator,
  markFeePaidValidator
} = require('../validators/studentFlow.validator');

// 1. View available batches (filtered) - No auth required for browsing
router.post('/batches', getAvailableBatchesValidator, validator, studentFlowController.getAvailableBatches); // Done ✅

// 2. Apply/Enroll in a batch - Requires student authentication
router.post('/batches/apply', authMiddleware.authenticateStudent, applyToBatchValidator, validator, studentFlowController.applyToBatch);//done ✅


// 3. Get student's enrolled batches - Requires student authentication
router.get('/my-batches', authMiddleware.authenticateStudent, studentFlowController.getMyBatches);

// 4. Get specific enrollment details - Requires student authentication
//router.get('/batches/:batchId/enrollment', authMiddleware.authenticateStudent, studentFlowController.getEnrollmentDetails);

// 5. Teacher approval endpoints (requires teacher role)
//router.post('/approve-enrollment', authMiddleware.authenticateTeacher, approveEnrollmentValidator, validator, studentFlowController.approveEnrollment);

// 6. Attendance management (requires teacher role)
//router.post('/update-attendance', authMiddleware.authenticateTeacher, updateAttendanceValidator, validator, studentFlowController.updateAttendance);

// 7. Fee management (requires teacher role)
//router.post('/mark-fee-paid', authMiddleware.authenticateTeacher, markFeePaidValidator, validator, studentFlowController.markFeePaid);

module.exports = router; 