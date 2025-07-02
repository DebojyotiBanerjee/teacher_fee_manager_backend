const express = require('express');
const authRoutes= require('./auth.routes');
const teacherRoutes = require('./teacher.routes');
const studentRoutes = require('./student.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/teacher', teacherRoutes);
router.use('/student', studentRoutes);

module.exports = router;