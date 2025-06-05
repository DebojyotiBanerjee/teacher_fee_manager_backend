const express = require('express');
const { Student } = require('../models/index.models');

const router = express.Router();

// Get all students
router.get('/', async (req, res) => {
  try {
    const students = await Student.find().populate('teacher');
    res.status(200).json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single student
router.get('/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).populate('teacher');
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    res.status(200).json(student);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new student
router.post('/', async (req, res) => {
  try {
    const student = new Student(req.body);
    const newStudent = await student.save();
    res.status(201).json(newStudent);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update student
router.put('/:id', async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    res.status(200).json(student);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete student
router.delete('/:id', async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    res.status(200).json({ message: 'Student deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;