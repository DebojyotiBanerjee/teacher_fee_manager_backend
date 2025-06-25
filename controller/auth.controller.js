const jwt = require('jsonwebtoken');
const User = require('../models/user.models');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Register a new user (teacher or student)
exports.register = async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();

    // Generate JWT token
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });

    res.status(201).json({
      message: 'Registration successful',
      userId: user._id,
      role: user.role,
      token
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Login a user (teacher or student)
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    // Select password explicitly since select: false in schema
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });

    res.json({
      message: 'Login successful',
      userId: user._id,
      role: user.role,
      token
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};