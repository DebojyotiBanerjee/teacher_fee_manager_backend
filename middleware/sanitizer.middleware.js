const { sanitizeRequest } = require('../utils/sanitizer');

// Middleware to sanitize all incoming requests
const sanitizeInput = (req, res, next) => {
  try {
    sanitizeRequest(req);
    next();
  } catch (error) {
    console.error('Sanitization error:', error);
    next(); // Continue even if sanitization fails
  }
};

// Middleware to sanitize specific fields while preserving sensitive data
const sanitizeExceptSensitive = (req, res, next) => {
  try {
    if (req.body) {
      const sensitiveFields = ['password', 'confirmPassword', 'newPassword', 'otp', 'resetPasswordOTP'];
      const sanitizedBody = { ...req.body };
      
      // Preserve sensitive fields
      const preservedFields = {};
      sensitiveFields.forEach(field => {
        if (sanitizedBody[field] !== undefined) {
          preservedFields[field] = sanitizedBody[field];
        }
      });
      
      // Sanitize the rest
      const sanitized = sanitizeRequest(req);
      
      // Restore sensitive fields
      Object.assign(sanitized.body, preservedFields);
      req.body = sanitized.body;
    }
    next();
  } catch (error) {
    console.error('Sanitization error:', error);
    next();
  }
};

// Middleware to sanitize only specific routes
const sanitizeRoute = (req, res, next) => {
  try {
    // Only sanitize certain routes
    const sanitizeRoutes = ['/api/teacher/detail', '/api/student/detail'];
    const shouldSanitize = sanitizeRoutes.some(route => req.path.includes(route));
    
    if (shouldSanitize) {
      sanitizeRequest(req);
    }
    next();
  } catch (error) {
    console.error('Route sanitization error:', error);
    next();
  }
};

module.exports = {
  sanitizeInput,
  sanitizeExceptSensitive,
  sanitizeRoute
}; 