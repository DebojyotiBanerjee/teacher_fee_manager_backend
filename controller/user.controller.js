const jwt = require('jsonwebtoken');
const Teacher = require('../models/teacher.models');

// Register a new teacher
exports.register = async (req, res) => {
  try {
    const teacher = new Teacher(req.body);
    await teacher.save();
    res.status(201).json({ message: 'Registration successful', teacherId: teacher._id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Login a teacher
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const teacher = await Teacher.findOne({ email }).select('+password');
    if (!teacher || !(await teacher.correctPassword(password, teacher.password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    // Generate JWT token
    const token = jwt.sign({ id: teacher._id }, 'your_jwt_secret', { expiresIn: '1d' });
    res.json({ message: 'Login successful', token });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};