const express = require('express');
const router = express.Router();
const detailTeacherController = require('../controller/detailTeacher.controller');
const { detailTeacherValidator, batchValidator } = require('../validators/teacher.validator');
const validator = require('../middleware/validator.middleware');
const { 
  authenticate, 
  authenticateTeacher
} = require('../middleware/auth.middleware');
const teacherEnrollController = require('../controller/teacherEnroll.controller');


router.get('/dashboard', authenticate, authenticateTeacher, detailTeacherController.teacherDashboard);


router.post('/detail', authenticateTeacher, detailTeacherValidator, validator, detailTeacherController.createDetailTeacher);

router.get('/detail/:id', authenticateTeacher, detailTeacherController.getDetailTeacherById);

router.put('/detail/:id', authenticateTeacher, detailTeacherValidator, validator, detailTeacherController.updateDetailTeacher);


router.delete('/detail/:id', authenticateTeacher, detailTeacherController.deleteDetailTeacher);

// Batch management routes (moved to teacherEnrollController)
router.post('/batch', authenticate, authenticateTeacher, batchValidator, teacherEnrollController.createBatch);
router.put('/batch/:id', authenticate, authenticateTeacher, batchValidator, teacherEnrollController.updateBatch);
router.delete('/batch/:id', authenticate, authenticateTeacher, teacherEnrollController.deleteBatch);
router.get('/batch/:id/students', authenticate, authenticateTeacher, teacherEnrollController.viewStudentsInBatch);

// New routes for teacher batch and attendance management
router.get('/batches', authenticate, authenticateTeacher, teacherEnrollController.viewMyBatches);
router.get('/batch/:id/attendance', authenticate, authenticateTeacher, teacherEnrollController.viewBatchAttendance);

module.exports = router;