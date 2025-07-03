const jwt = require('jsonwebtoken');
const User = require('../models/user.models');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Unified authentication middleware
const authenticate = (requiredRole = null) => async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        message: 'No token provided' 
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    // Find user in database
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token - user not found' 
      });
    }

    // Check if role is required and matches
    if (requiredRole && user.role !== requiredRole) {
      return res.status(403).json({ 
        success: false,
        message: `Access denied. Requires ${requiredRole} role` 
      });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ 
      success: false,
      message: 'Invalid or expired token' 
    });
  }
};

// Specific role middlewares
const authenticateTeacher = authenticate('teacher');
const authenticateStudent = authenticate('student');

module.exports = {
  authenticate,
  authenticateTeacher,
  authenticateStudent
};