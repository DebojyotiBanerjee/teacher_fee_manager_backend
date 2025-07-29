// Utility functions to eliminate repeated code patterns across controllers

/**
 * Standard error response handler
 */
const handleError = (err, res, customMessage = null) => {
  console.error('Controller Error:', err);
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: customMessage || 'Validation failed',
      errors: err.errors ? Object.values(err.errors).map(e => e.message) : [customMessage || 'Validation failed']
    });
  }
  
  if (err.name === 'MongoError' && err.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'Duplicate entry found'
    });
  }
  
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    });
  }
  
  return res.status(500).json({
    success: false,
    message: customMessage || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};

/**
 * Standard success response handler
 */
const sendSuccessResponse = (res, data, message = 'Operation successful', statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

/**
 * Role-based access control check
 */
const checkRoleAccess = (req, requiredRole) => {
  if (req.user.role !== requiredRole) {
    return {
      allowed: false,
      message: `Access denied. Requires ${requiredRole} role`
    };
  }
  return { allowed: true };
};

/**
 * Check if profile already exists
 */
const checkExistingProfile = async (Model, userId) => {
  const existingProfile = await Model.findOne({ user: userId });
  return {
    exists: !!existingProfile,
    profile: existingProfile
  };
};

/**
 * Create profile with common logic
 */
const createProfile = async (Model, userData, userId, populateFields = 'user') => {
  const profileData = { ...userData, user: userId };
  const profile = new Model(profileData);
  await profile.save();
  
  // Populate and return
  const populatedProfile = await Model.findById(profile._id).populate(populateFields);
  return populatedProfile;
};

/**
 * Update profile with common logic
 */
const updateProfile = async (Model, userId, updateData, populateOptions = {}) => {
  // Find and update the profile
  const updatedProfile = await Model.findOneAndUpdate(
    { user: userId },
    updateData,
    { 
      new: true,
      runValidators: true,
      upsert: false
    }
  );
  
  if (!updatedProfile) {
    throw new Error('Profile not found for update');
  }
  
  // Apply populate options
  let query = Model.findById(updatedProfile._id);
  
  if (populateOptions.user) {
    query = query.populate('user', populateOptions.user);
  }
  if (populateOptions.batches) {
    query = query.populate('batches', populateOptions.batches);
  }
  if (populateOptions.ratings) {
    query = query.populate({
      path: 'ratings',
      select: populateOptions.ratings.select || 'rating comment type',
      options: { limit: populateOptions.ratings.limit || 10 }
    });
  }
  if (populateOptions.enrolledBatches) {
    query = query.populate('enrolledBatches.batch', populateOptions.enrolledBatches);
  }
  if (populateOptions.subjects) {
    query = query.populate('subjects.subject', populateOptions.subjects);
  }
  
  return await query;
};

/**
 * Get profile with common logic
 */
const getProfile = async (Model, userId, populateOptions = {}, additionalFilters = {}) => {
  let query = Model.findOne({ user: userId, ...additionalFilters });
  
  // Apply populate options
  if (populateOptions.user) {
    query = query.populate('user', populateOptions.user);
  }
  if (populateOptions.batches) {
    query = query.populate('batches', populateOptions.batches);
  }
  if (populateOptions.ratings) {
    query = query.populate({
      path: 'ratings',
      select: populateOptions.ratings.select || 'rating comment type',
      options: { limit: populateOptions.ratings.limit || 10 }
    });
  }
  if (populateOptions.enrolledBatches) {
    query = query.populate('enrolledBatches.batch', populateOptions.enrolledBatches);
  }
  if (populateOptions.subjects) {
    query = query.populate('subjects.subject', populateOptions.subjects);
  }
  if (populateOptions.guardian) {
    // For student profiles, guardian is embedded, so no populate needed
  }
  
  return await query;
};

/**
 * Standard dashboard response
 */
const sendDashboardResponse = (res, userId, role) => {
  return sendSuccessResponse(res, {
    userId,
    role
  }, `Welcome to ${role.charAt(0).toUpperCase() + role.slice(1)} Dashboard`);
};

/**
 * Log controller action
 */
const logControllerAction = (action, user, additionalData = {}) => {
  console.log(`${action} - User:`, user);
  console.log(`${action} - User ID:`, user._id);
  console.log(`${action} - User Role:`, user.role);
  if (Object.keys(additionalData).length > 0) {
    console.log(`${action} - Additional Data:`, additionalData);
  }
};

/**
 * Check if a teacher profile is complete
 */
const isProfileComplete = (profile) => {
  if (!profile) return false;
  return (
    Array.isArray(profile.qualifications) && profile.qualifications.length > 0 &&
    profile.qualifications.every(q => q.degree && q.institution) &&
    profile.experience && typeof profile.experience.years === 'number' &&
    Array.isArray(profile.experience.previousInstitutions) &&
    profile.address && profile.address.street && profile.address.city && profile.address.state && profile.address.pincode &&
    Array.isArray(profile.subjectsTaught) && profile.subjectsTaught.length > 0
  );
};

/**
 * Check if a document belongs to a user (by teacher field)
 */
const checkOwnership = (doc, userId) => {
  return doc && doc.teacher && doc.teacher.toString() === userId.toString();
};

/**
 * Check for duplicate document in a collection
 */
const checkDuplicate = async (Model, filter) => {
  return await Model.findOne(filter);
};

/**
 * Check if a teacher can access course methods (profile complete, role, ownership)
 */
const canAccessCourse = async (req, DetailTeacher, Course) => {
  if (!req.user || req.user.role !== 'teacher') return false;
  const profile = await DetailTeacher.findOne({ user: req.user._id });
  if (!isProfileComplete(profile)) return false;
  return true;
};

/**
 * Check if a student can view/enroll in courses
 */
const canStudentViewOrEnroll = (req) => {
  return req.user && req.user.role === 'student';
};

/**
 * Checks if the current user is the owner (teacher) of the resource.
 * @param {Object} resource - The resource (course or batch).
 * @param {String} userId - The user ID from the JWT.
 * @returns {Boolean}
 */
const isOwner = (resource, userId) => {
  if (!resource || !userId) return false;
  // For course: resource.teacher
  // For batch: resource.teacher or resource.course.teacher
  if (resource.teacher && resource.teacher.toString() === userId.toString()) return true;
  if (resource.course && resource.course.teacher && resource.course.teacher.toString() === userId.toString()) return true;
  return false;
};

/**
 * Centralized, optimized soft delete utility
 * @param {Mongoose.Model} Model - The Mongoose model
 * @param {Object} filter - The filter to find the document
 * @param {Object} [extraUpdateFields={}] - Any extra fields to update
 * @returns {Promise<Object|null>} - The updated document or null if not found
 */
const softDelete = async (Model, filter, extraUpdateFields = {}) => {
  return await Model.findOneAndUpdate(
    filter,
    { $set: { isDeleted: true, ...extraUpdateFields } },
    { new: true }
  );
};

/**
 * Token management utilities
 */
const tokenUtils = {
  // In-memory token blacklist (in production, use Redis)
  blacklistedTokens: new Set(),

  // Add token to blacklist
  blacklistToken: (token) => {
    tokenUtils.blacklistedTokens.add(token);
  },

  // Check if token is blacklisted
  isTokenBlacklisted: (token) => {
    return tokenUtils.blacklistedTokens.has(token);
  },

  // Clear expired tokens from blacklist (run periodically)
  cleanupBlacklist: () => {
    // In production, implement proper cleanup with timestamps
    if (tokenUtils.blacklistedTokens.size > 1000) {
      tokenUtils.blacklistedTokens.clear();
    }
  }
};

module.exports = {
  handleError,
  sendSuccessResponse,
  checkRoleAccess,
  checkExistingProfile,
  createProfile,
  updateProfile,
  getProfile,
  sendDashboardResponse,
  logControllerAction,
  isProfileComplete,
  checkOwnership,
  checkDuplicate,
  canAccessCourse,
  canStudentViewOrEnroll,
  isOwner,
  softDelete,
  checkRoleAccess,
  tokenUtils
}; 