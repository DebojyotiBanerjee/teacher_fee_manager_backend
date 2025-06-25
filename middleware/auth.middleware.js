const jwt = require('jsonwebtoken');
const Teacher = require('../models/teacher.models');
const Student = require('../models/student.models');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Try User model first (for unified login)
    let user = await User.findById(decoded.id);
    if (user) {
      req.user = user;
      req.role = user.role;
      return next();
    }

    // Fallback: Try Teacher
    user = await Teacher.findById(decoded.id);
    if (user) {
      req.teacher = user;
      req.role = 'Teacher';
      return next();
    }

    // Fallback: Try Student
    user = await Student.findById(decoded.id);
    if (user) {
      req.student = user;
      req.role = 'Student';
      return next();
    }

    return res.status(401).json({ error: 'Invalid token' });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = { requireAuth };