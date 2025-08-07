const express = require('express');
const router = express.Router();
const notificationController = require('../controller/notification.controller');
const { authenticateTeacher, authenticateStudent } = require('../middleware/auth.middleware');

// Teacher notification routes
router.get('/teacher', authenticateTeacher, notificationController.getTeacherNotifications);
router.put('/teacher/read-all', authenticateTeacher, notificationController.markAllNotificationsAsRead);

// Student notification routes
router.get('/student', authenticateStudent, notificationController.getStudentNotifications);
router.put('/student/read-all', authenticateStudent, notificationController.markAllNotificationsAsRead);

module.exports = router; 