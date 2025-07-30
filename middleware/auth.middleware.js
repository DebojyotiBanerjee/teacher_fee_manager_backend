const jwt = require('jsonwebtoken');
const User = require('../models/user.models');
const { tokenUtils } = require('../utils/controllerUtils');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

// Token expiry settings for testing
const ACCESS_TOKEN_EXPIRY_MS = Number(process.env.ACCESS_TOKEN_EXPIRY_MS) || 20 * 1000; // 20 seconds
const REFRESH_TOKEN_EXPIRY_MS = Number(process.env.REFRESH_TOKEN_EXPIRY_MS) || 60 * 1000; // 60 seconds
const ACCESS_TOKEN_EXPIRY_SECONDS = Math.floor(ACCESS_TOKEN_EXPIRY_MS / 1000);

// Function to automatically refresh access token using refresh token
const autoRefreshAccessToken = async (req, res, user) => {
  try {
    // Check if user has a valid refresh token
    let refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return false; // No refresh token available
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, JWT_SECRET);
    } catch (err) {
      return false; // Invalid or expired refresh token
    }

    // Check if refresh token belongs to the same user
    if (decoded.id !== user._id.toString()) {
      return false; // Refresh token doesn't match user
    }

    // Generate new access token
    const newAccessToken = jwt.sign(
      { id: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS }
    );

    // Set the new access token cookie
    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      maxAge: ACCESS_TOKEN_EXPIRY_MS,
      path: '/'
    });

    console.log('Auto-refreshed access token for user:', user._id);
    return newAccessToken;
  } catch (err) {
    console.error('Auto refresh token error:', err);
    return false;
  }
};

// Unified authentication middleware with automatic token refresh
const authenticate = (requiredRole = null) => async (req, res, next) => {
  try {
    // Try to get token from cookies first, then from Authorization header as fallback
    let token = req.cookies.accessToken;
    
    if (!token) {
      // Fallback to Authorization header
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    // If no access token found, try to generate one using refresh token
    if (!token) {
      // Check if we have a refresh token
      const refreshToken = req.cookies.refreshToken;
      if (!refreshToken) {
        // No refresh token available, redirect to login
        return res.status(401).json({
          success: false,
          message: 'No access token or refresh token found',
          redirectToLogin: true
        });
      }

      // Try to verify refresh token and get user
      try {
        const refreshDecoded = jwt.verify(refreshToken, JWT_SECRET);
        const user = await User.findById(refreshDecoded.id);
        
        if (!user || !user.isActive || !user.isVerified) {
          return res.status(401).json({
            success: false,
            message: 'Invalid refresh token - user not found or inactive',
            redirectToLogin: true
          });
        }

        // Generate new access token
        const newAccessToken = jwt.sign(
          { id: user._id, role: user.role },
          JWT_SECRET,
          { expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS }
        );

        // Set the new access token cookie
        res.cookie('accessToken', newAccessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'Lax',
          maxAge: ACCESS_TOKEN_EXPIRY_MS,
          path: '/'
        });

        console.log('Generated new access token from refresh token for user:', user._id);
        
        // Check role requirement
        if (requiredRole && user.role !== requiredRole) {
          return res.status(403).json({
            success: false,
            message: `Access denied. Requires ${requiredRole} role`
          });
        }

        // Attach user to request
        req.user = user;
        next();
        return;
      } catch (err) {
        // Invalid refresh token, redirect to login
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired refresh token',
          redirectToLogin: true
        });
      }
    }

    // Check if token is blacklisted
    if (tokenUtils.isTokenBlacklisted(token)) {
      return res.status(401).json({ 
        success: false,
        message: 'Token has been revoked',
        redirectToLogin: true
      });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);

      // Find user in database
      const user = await User.findById(decoded.id);
      if (!user) {
        return res.status(401).json({ 
          success: false,
          message: 'Invalid token - user not found',
          redirectToLogin: true
        });
      }

      // Check if user is verified
      if (!user.isVerified) {
        return res.status(401).json({ 
          success: false,
          message: 'User account not verified',
          redirectToLogin: true
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
      // Access token is invalid or expired
      if (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError') {
        // Try to refresh the access token using refresh token
        const refreshToken = req.cookies.refreshToken;
        
        if (!refreshToken) {
          // No refresh token available, redirect to login
          return res.status(401).json({
            success: false,
            message: 'Access token expired and no refresh token available',
            redirectToLogin: true
          });
        }

        // Try to verify refresh token and get user
        try {
          const refreshDecoded = jwt.verify(refreshToken, JWT_SECRET);
          const user = await User.findById(refreshDecoded.id);
          
          if (!user || !user.isActive || !user.isVerified) {
            return res.status(401).json({
              success: false,
              message: 'Invalid refresh token - user not found or inactive',
              redirectToLogin: true
            });
          }

          // Generate new access token
          const newAccessToken = jwt.sign(
            { id: user._id, role: user.role },
            JWT_SECRET,
            { expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS }
          );

          // Set the new access token cookie
          res.cookie('accessToken', newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Lax',
            maxAge: ACCESS_TOKEN_EXPIRY_MS,
            path: '/'
          });

          console.log('Auto-refreshed access token for user:', user._id);
          
          // Check role requirement
          if (requiredRole && user.role !== requiredRole) {
            return res.status(403).json({
              success: false,
              message: `Access denied. Requires ${requiredRole} role`
            });
          }

          // Attach user to request
          req.user = user;
          next();
          return;
        } catch (refreshErr) {
          // Invalid refresh token, redirect to login
          return res.status(401).json({
            success: false,
            message: 'Access token expired and refresh token is invalid',
            redirectToLogin: true
          });
        }
      }

      // Other authentication errors
      console.error('Authentication error:', err.message);
      return res.status(401).json({ 
        success: false,
        message: 'Authentication failed',
        redirectToLogin: true
      });
    }
  } catch (err) {
    console.error('Authentication middleware error:', err);
    return res.status(500).json({ 
      success: false,
      message: 'Server error during authentication'
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