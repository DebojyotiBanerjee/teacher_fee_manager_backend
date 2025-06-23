const express = require('express');
const paymentController = require('../controller/payment.controller');

const router = express.Router();

// Get all payments
router.get('/', paymentController.getAllPayments);

// Get single payment
router.get('/:id', paymentController.getPaymentById);

// Create new payment
router.post('/', paymentController.createPayment);

// Update payment
router.put('/:id', paymentController.updatePayment);

// Get student payments
router.get('/student/:studentId', paymentController.getStudentPayments);

// Get monthly revenue
router.get('/revenue/:month/:year', paymentController.getMonthlyRevenue);

module.exports = router;