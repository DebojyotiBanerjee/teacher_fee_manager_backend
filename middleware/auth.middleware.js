const jwt = require('jsonwebtoken');
const User = require('../models/user.models');
const { tokenUtils } = require('../utils/controllerUtils');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

// Unified authentication middleware
const authenticate = (requiredRole = null) => async (req, res, next) => {
  try {
    // Try to get token from cookies first, then from Authorization header as fallback
    let token = req.cookies.accessToken;
    
    if (!token) {
      // Fallback to Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
          success: false,
          message: 'No token provided' 
        });
      }
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'Access token is required' 
      });
    }

    // Check if token is blacklisted
    if (tokenUtils.isTokenBlacklisted(token)) {
      return res.status(401).json({ 
        success: false,
        message: 'Token has been revoked' 
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    // Find user in database
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token - user not found' 
      });
    }

    // Check if user is verified
    if (!user.isVerified) {
      return res.status(401).json({ 
        success: false,
        message: 'User account not verified' 
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
    console.error('Authentication error:', err.message);
    
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        message: 'Token expired' 
      });
    }
    
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token' 
      });
    }
    
    return res.status(401).json({ 
      success: false,
      message: 'Authentication failed' 
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