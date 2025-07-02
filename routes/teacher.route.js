const express = require('express');
const router = express.Router();
const { authenticateTeacher } = require('../middleware/role.middleware');
const detailTeacherController = require('../controller/detailTeacher.controller');
const { detailTeacherValidator } = require('../validators/teacher.validator');
const validator = require('../middleware/validator.middleware');

/**
 * @swagger
 * /teacher/dashboard:
 *   get:
 *     tags: [Teacher]
 *     summary: Get teacher dashboard data
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Teacher dashboard data
 */
router.get('/dashboard', authenticateTeacher);

/**
 * @swagger
 * /teacher/detail:
 *   post:
 *     tags: [Teacher]
 *     summary: Create teacher detail
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
 *         description: Teacher detail created
 */
router.post('/detail', authenticateTeacher, detailTeacherValidator, validator, detailTeacherController.createDetailTeacher);

/**
 * @swagger
 * /teacher/detail/{id}:
 *   get:
 *     tags: [Teacher]
 *     summary: Get teacher detail by ID
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
 *         description: Teacher detail data
 */
router.get('/detail/:id', authenticateTeacher, detailTeacherController.getDetailTeacherById);

/**
 * @swagger
 * /teacher/detail/{id}:
 *   put:
 *     tags: [Teacher]
 *     summary: Update teacher detail by ID
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
 *               // Add other fields as per your model
 *     responses:
 *       200:
 *         description: Teacher detail updated
 */
router.put('/detail/:id', authenticateTeacher, detailTeacherValidator, validator, detailTeacherController.updateDetailTeacher);

/**
 * @swagger
 * /teacher/detail/{id}:
 *   delete:
 *     tags: [Teacher]
 *     summary: Delete teacher detail by ID
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
 *         description: Teacher detail deleted
 */
router.delete('/detail/:id', authenticateTeacher, detailTeacherController.deleteDetailTeacher);

module.exports = router;