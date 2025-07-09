const express = require('express');
const router = express.Router();
const detailTeacherController = require('../controller/detailTeacher.controller');
const { detailTeacherValidator } = require('../validators/teacher.validator');
const validator = require('../middleware/validator.middleware');
const { 
  authenticate, 
  authenticateTeacher
} = require('../middleware/auth.middleware');

// Get teacher dashboard data
router.get('/dashboard', authenticate, authenticateTeacher, detailTeacherController.teacherDashboard);

// Create teacher detail
router.post('/detail', authenticateTeacher, detailTeacherValidator, validator, detailTeacherController.createDetailTeacher);

// Get teacher detail by ID
router.get('/detail/:id', authenticateTeacher, detailTeacherController.getDetailTeacherById);

// Update teacher detail by ID
router.put('/detail/:id', authenticateTeacher, detailTeacherValidator, validator, detailTeacherController.updateDetailTeacher);

// Delete teacher detail by ID
router.delete('/detail/:id', authenticateTeacher, detailTeacherController.deleteDetailTeacher);

module.exports = router;
