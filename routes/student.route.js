const express = require('express');
const router = express.Router();
const { authenticateStudent } = require('../middleware/role.middleware');
const detailStudentController = require('../controller/detailStudent.controller');
const { detailStudentValidator } = require('../validators/student.validator');
const validator = require('../middleware/validator.middleware');

// Student dashboard route
router.get('/dashboard', authenticateStudent, detailStudentController.getStudentDashboard);

// CRUD endpoints for detailStudent
router.post('/detail', authenticateStudent, ...detailStudentValidator, validator, detailStudentController.createDetailStudent);
router.get('/detail/:id', authenticateStudent, detailStudentController.getDetailStudentById);
router.put('/detail/:id', authenticateStudent, ...detailStudentValidator, validator, detailStudentController.updateDetailStudent);
router.delete('/detail/:id', authenticateStudent, detailStudentController.deleteDetailStudent);

// Add more student-specific endpoints as needed

module.exports = router;