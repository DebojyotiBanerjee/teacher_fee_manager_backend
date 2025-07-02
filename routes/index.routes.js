const express = require('express');

const authRoutes= require('./auth.routes');
const teacherRoutes = require('./teacher.route');
const studentRoutes = require('./student.route');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/teacher', teacherRoutes);
router.use('/student', studentRoutes);

module.exports = router;