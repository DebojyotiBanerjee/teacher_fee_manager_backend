const express = require('express');
const router = express.Router();
const detailStudentController = require('../controller/detailStudent.controller');
const { detailStudentValidator } = require('../validators/student.validator');
const validator = require('../middleware/validator.middleware');
const { 
  authenticate,   
  authenticateStudent
} = require('../middleware/auth.middleware');

router.get('/dashboard', authenticate, authenticateStudent, detailStudentController.studentDashboard);

router.post('/detail', authenticateStudent, ...detailStudentValidator, validator, detailStudentController.createDetailStudent);

router.get('/detail/:id', authenticateStudent, detailStudentController.getDetailStudentById);

router.put('/detail/:id', authenticateStudent, ...detailStudentValidator, validator, detailStudentController.updateDetailStudent);


router.delete('/detail/:id', authenticateStudent, detailStudentController.deleteDetailStudent);

module.exports = router;
