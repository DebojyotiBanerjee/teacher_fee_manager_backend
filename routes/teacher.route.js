const express = require('express');
const router = express.Router();
const detailTeacherController = require('../controller/detailTeacher.controller');
const { detailTeacherValidator } = require('../validators/teacher.validator');
const validator = require('../middleware/validator.middleware');
const { 
  authenticate, 
  authenticateTeacher
} = require('../middleware/auth.middleware');

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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */
router.get('/dashboard', authenticate, authenticateTeacher, detailTeacherController.teacherDashboard);

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
 *             $ref: '#/components/schemas/DetailTeacher'
 *     responses:
 *       201:
 *         description: Teacher detail created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DetailTeacher'
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DetailTeacher'
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
 *             $ref: '#/components/schemas/DetailTeacher'
 *     responses:
 *       200:
 *         description: Teacher detail updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DetailTeacher'
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */
router.delete('/detail/:id', authenticateTeacher, detailTeacherController.deleteDetailTeacher);

module.exports = router;