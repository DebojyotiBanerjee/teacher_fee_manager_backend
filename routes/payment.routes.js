const express = require('express');
const { Payment } = require('../models/index.models');

const router = express.Router();

// Get all payments
router.get('/', async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate('student')
      .populate('teacher');
    res.status(200).json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single payment
router.get('/:id', async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('student')
      .populate('teacher');
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    res.status(200).json(payment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new payment
router.post('/', async (req, res) => {
  try {
    const payment = new Payment(req.body);
    const newPayment = await payment.save();
    res.status(201).json(newPayment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update payment
router.put('/:id', async (req, res) => {
  try {
    const payment = await Payment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    res.status(200).json(payment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get student payments
router.get('/student/:studentId', async (req, res) => {
  try {
    const payments = await Payment.getStudentPayments(req.params.studentId);
    res.status(200).json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get monthly revenue
router.get('/revenue/:month/:year', async (req, res) => {
  try {
    const revenue = await Payment.getMonthlyRevenue(req.params.month, parseInt(req.params.year));
    res.status(200).json(revenue[0] || { totalRevenue: 0, totalPayments: 0 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;