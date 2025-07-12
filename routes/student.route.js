const express = require('express');
const router = express.Router();
const detailStudentController = require('../controller/detailStudent.controller');
const { DetailStudent } = require('../validators/student.validator');
const validator = require('../middleware/validator.middleware');
const { 
  authenticateStudent
} = require('../middleware/auth.middleware');
const { sanitizeInput } = require('../middleware/sanitizer.middleware');

// Student Dashboard
router.get('/dashboard', authenticateStudent, detailStudentController.studentDashboard);

// Student Detail Management
router.post('/detail', authenticateStudent, sanitizeInput, DetailStudent, validator, detailStudentController.createDetailStudent);
router.get('/detail', authenticateStudent, detailStudentController.getDetailStudentById);
router.put('/detail', authenticateStudent, sanitizeInput, DetailStudent, validator, detailStudentController.updateDetailStudent);
router.delete('/detail', authenticateStudent, detailStudentController.deleteDetailStudent);

module.exports = router;
