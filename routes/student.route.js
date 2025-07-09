const express = require('express');
const router = express.Router();
const detailStudentController = require('../controller/detailStudent.controller');
const { detailStudentValidator } = require('../validators/student.validator');
const validator = require('../middleware/validator.middleware');
const { 
  authenticate,   
  authenticateStudent
} = require('../middleware/auth.middleware');

// Get student dashboard data
router.get('/dashboard', authenticate, authenticateStudent, detailStudentController.studentDashboard);

// Create student detail
router.post('/detail', authenticateStudent, ...detailStudentValidator, validator, detailStudentController.createDetailStudent);

// Get student detail by ID
router.get('/detail/:id', authenticateStudent, detailStudentController.getDetailStudentById);

// Update student detail by ID
router.put('/detail/:id', authenticateStudent, ...detailStudentValidator, validator, detailStudentController.updateDetailStudent);

// Delete student detail by ID
router.delete('/detail/:id', authenticateStudent, detailStudentController.deleteDetailStudent);

module.exports = router;
