const express = require('express');
const router = express.Router();
const { authenticateTeacher } = require('../middleware/role.middleware');
const detailTeacherController = require('../controller/detailTeacher.controller');
const { detailTeacherValidator } = require('../validators/teacher.validator');
const validator = require('../middleware/validator.middleware');

// CRUD endpoints for detailTeacher
router.post('/detail', authenticateTeacher, detailTeacherValidator, validator, detailTeacherController.createDetailTeacher);
router.get('/detail/:id', authenticateTeacher, detailTeacherController.getDetailTeacherById);
router.put('/detail/:id', authenticateTeacher, detailTeacherValidator, validator, detailTeacherController.updateDetailTeacher);
router.delete('/detail/:id', authenticateTeacher, detailTeacherController.deleteDetailTeacher);

// Add more teacher-specific endpoints as needed

module.exports = router;