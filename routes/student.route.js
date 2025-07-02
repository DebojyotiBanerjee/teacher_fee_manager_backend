const express = require('express');
const router = express.Router();
const { authenticateStudent } = require('../middleware/role.middleware');
const Student = require('../models/detailStudent.model'); // Adjust path if needed
const { getStudentDashboard } = require('../controller/auth.controller');

// GET /student/dashboard - Show student dashboard and details
router.get('/dashboard', authenticateStudent, getStudentDashboard);

module.exports = router;