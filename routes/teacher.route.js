const express = require('express');
const router = express.Router();
const { authenticateTeacher } = require('../middleware/role.middleware');
const { getTeacherDashboard } = require('../controller/auth.controller');

// GET /teacher/dashboard - Show teacher dashboard and details
router.get('/dashboard', authenticateTeacher, getTeacherDashboard);

module.exports = router;