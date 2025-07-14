// Input sanitization utility to prevent XSS and injection attacks

/**
 * Basic string sanitization
 */
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  
  return str
    .trim()
    .replace(/[<>]/g, '') // Remove < and > to prevent basic XSS
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .replace(/script/gi, '') // Remove script tags
    .replace(/iframe/gi, ''); // Remove iframe tags
};

/**
 * Sanitize object recursively
 */
const sanitizeObject = (obj) => {
  if (typeof obj !== 'object' || obj === null) {
    return sanitizeString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    // Skip sanitization for sensitive fields
    if (['password', 'confirmPassword', 'newPassword', 'otp', 'resetPasswordOTP'].includes(key)) {
      sanitized[key] = value;
    } else {
      sanitized[key] = sanitizeObject(value);
    }
  }
  
  return sanitized;
};

/**
 * Sanitize request data
 */
const sanitizeRequest = (req) => {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  return req;
};

/**
 * Validate and sanitize email
 */
const sanitizeEmail = (email) => {
  if (!email || typeof email !== 'string') return null;
  
  const sanitized = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  return emailRegex.test(sanitized) ? sanitized : null;
};

/**
 * Validate and sanitize phone number
 */
const sanitizePhone = (phone) => {
  if (!phone || typeof phone !== 'string') return null;
  
  const sanitized = phone.replace(/\D/g, ''); // Remove non-digits
  return sanitized.length === 10 ? sanitized : null;
};

/**
 * Sanitize MongoDB ObjectId
 */
const sanitizeObjectId = (id) => {
  if (!id) return null;
  
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  return objectIdRegex.test(id.toString()) ? id.toString() : null;
};

/**
 * Sanitize text fields (remove HTML and limit length)
 */
const sanitizeText = (text, maxLength = 1000) => {
  if (!text || typeof text !== 'string') return '';
  
  const sanitized = text
    .trim()
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
  
  return sanitized.length > maxLength ? sanitized.substring(0, maxLength) : sanitized;
};

/**
 * Sanitize array of strings
 */
const sanitizeStringArray = (arr) => {
  if (!Array.isArray(arr)) return [];
  
  return arr
    .filter(item => typeof item === 'string')
    .map(item => sanitizeString(item))
    .filter(item => item.length > 0);
};

/**
 * Sanitize education data
 */
const sanitizeEducation = (education) => {
  if (!education || typeof education !== 'object') return {};
  
  return {
    currentLevel: sanitizeText(education.currentLevel, 50),
    institution: sanitizeText(education.institution, 100),
    grade: education.grade ? sanitizeText(education.grade, 20) : undefined,
    yearOfStudy: typeof education.yearOfStudy === 'number' ? education.yearOfStudy : undefined,
    board: education.board ? sanitizeText(education.board, 50) : undefined
  };
};

/**
 * Sanitize guardian data
 */
const sanitizeGuardian = (guardian) => {
  if (!guardian || typeof guardian !== 'object') return {};
  
  return {
    name: sanitizeText(guardian.name, 100),
    relation: sanitizeText(guardian.relation, 50),
    phone: sanitizePhone(guardian.phone),
    email: sanitizeEmail(guardian.email),
    occupation: guardian.occupation ? sanitizeText(guardian.occupation, 100) : undefined
  };
};

/**
 * Sanitize address data
 */
const sanitizeAddress = (address) => {
  if (!address || typeof address !== 'object') return {};
  
  return {
    street: address.street ? sanitizeText(address.street, 200) : undefined,
    city: address.city ? sanitizeText(address.city, 50) : undefined,
    state: address.state ? sanitizeText(address.state, 50) : undefined,
    pincode: address.pincode ? sanitizeText(address.pincode, 10) : undefined,
    country: address.country ? sanitizeText(address.country, 50) : undefined
  };
};

module.exports = {
  sanitizeString,
  sanitizeObject,
  sanitizeRequest,
  sanitizeEmail,
  sanitizePhone,
  sanitizeObjectId,
  sanitizeText,
  sanitizeStringArray,
  sanitizeEducation,
  sanitizeGuardian,
  sanitizeAddress
}; 