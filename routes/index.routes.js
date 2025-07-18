const express = require('express');

const authRoutes= require('./auth.routes');
const teacherRoutes = require('./teacher.route');
const studentRoutes = require('./student.route');
const studentFlowRoutes = require('./studentFlow.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/teacher', teacherRoutes);
router.use('/user', studentRoutes);
router.use('/user-Flow', studentFlowRoutes);

module.exports = router;