const express = require('express');
const router = express.Router();
const detailStudentController = require('../controller/detailStudent.controller');
const { detailStudentValidator } = require('../validators/student.validator');
const validator = require('../middleware/validator.middleware');
const { 
  authenticateStudent
} = require('../middleware/auth.middleware');

// Student Dashboard
router.get('/dashboard', authenticateStudent, detailStudentController.studentDashboard);

// Student Detail Management
router.post('/detail', authenticateStudent, detailStudentValidator, validator, detailStudentController.createDetailStudent);
router.get('/detail', authenticateStudent, detailStudentController.getDetailStudentById);
router.put('/detail', authenticateStudent, detailStudentValidator, validator, detailStudentController.updateDetailStudent);
router.delete('/detail', authenticateStudent, detailStudentController.deleteDetailStudent);

module.exports = router;
