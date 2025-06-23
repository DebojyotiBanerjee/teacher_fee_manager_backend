const express = require('express');
const academicController = require('../controller/academic.controller');

const router = express.Router();

router.post('/', academicController.createAcademic);
router.get('/', academicController.getAllAcademics);
router.get('/:id', academicController.getAcademicById);
router.put('/:id', academicController.updateAcademic);
router.delete('/:id', academicController.deleteAcademic);

module.exports = router;