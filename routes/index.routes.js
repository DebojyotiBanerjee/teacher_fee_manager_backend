const express = require('express');
const teacherRoutes = require('./teacher.routes');
const studentRoutes = require('./student.routes');
const paymentRoutes = require('./payment.routes');

const router = express.Router();

router.use('/teachers', teacherRoutes);
router.use('/students', studentRoutes);
router.use('/payments', paymentRoutes);

module.exports = router;