const express = require('express');
const router = express.Router();
const { authenticateStudent } = require('../middleware/role.middleware');
const detailStudentController = require('../controller/detailStudent.controller');
const { detailStudentValidator } = require('../validators/student.validator');
const validator = require('../middleware/validator.middleware');

/**
 * @swagger
 * /student/dashboard:
 *   get:
 *     tags: [Student]
 *     summary: Get student dashboard data
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Student dashboard data
 */
router.get('/dashboard', authenticateStudent, detailStudentController.getStudentDashboard);

/**
 * @swagger
 * /student/detail:
 *   post:
 *     tags: [Student]
 *     summary: Create student detail
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user:
 *                 type: string
 *               # Add more fields here as needed, but do NOT use comments in YAML
 *     responses:
 *       201:
 *         description: Student detail created
 */
router.post('/detail', authenticateStudent, ...detailStudentValidator, validator, detailStudentController.createDetailStudent);

/**
 * @swagger
 * /student/detail/{id}:
 *   get:
 *     tags: [Student]
 *     summary: Get student detail by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Student detail data
 */
router.get('/detail/:id', authenticateStudent, detailStudentController.getDetailStudentById);

/**
 * @swagger
 * /student/detail/{id}:
 *   put:
 *     tags: [Student]
 *     summary: Update student detail by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user:
 *                 type: string
 *               # Add more fields here as needed, but do NOT use comments in YAML
 *     responses:
 *       200:
 *         description: Student detail updated
 */
router.put('/detail/:id', authenticateStudent, ...detailStudentValidator, validator, detailStudentController.updateDetailStudent);

/**
 * @swagger
 * /student/detail/{id}:
 *   delete:
 *     tags: [Student]
 *     summary: Delete student detail by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Student detail deleted
 */
router.delete('/detail/:id', authenticateStudent, detailStudentController.deleteDetailStudent);

module.exports = router;