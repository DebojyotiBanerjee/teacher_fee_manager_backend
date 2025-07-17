const DetailTeacher = require('../models/detailTeacher.models');
const TeacherEnrollment = require('../models/batch.models');
const { 
  handleError, 
  sendSuccessResponse, 
  checkRoleAccess, 
  checkExistingProfile, 
  createProfile, 
  updateProfile,    
  sendDashboardResponse, 
  logControllerAction 
} = require('../utils/controllerUtils');
const { sanitizeRequest } = require('../utils/sanitizer');

// Centralized populate options for teacher detail
const TEACHER_POPULATE_OPTIONS = [
  { path: 'user', select: 'fullname email role phone' }
];

exports.teacherDashboard = async (req, res) => {
  try {
    logControllerAction('Teacher Dashboard', req.user);
    sendDashboardResponse(res, req.user._id, req.user.role);
  } catch (err) {
    handleError(err, res, 'Dashboard error');
  }
};

// Create a new detailTeacher
exports.createDetailTeacher = async (req, res) => {
  try {
    logControllerAction('Create Teacher Detail', req.user, { body: req.body });
    
    // Sanitize input
    sanitizeRequest(req);
    
    // Check role access
    const roleCheck = checkRoleAccess(req, 'teacher');
    if (!roleCheck.allowed) {
      return res.status(403).json({
        success: false,
        message: roleCheck.message
      });
    }

    // Check if profile already exists
    const { exists  } = await checkExistingProfile(DetailTeacher, req.user._id);
    if (exists) {
      return res.status(409).json({
        success: false,
        message: 'Teacher detail already exists for this user'
      });
    }

    // Create profile with populated user
    const savedTeacher = await createProfile(
      DetailTeacher, 
      req.body, 
      req.user._id, 
      'user fullname email role phone'
    );
    
    sendSuccessResponse(res, {
      ...savedTeacher.toObject(),
      teacherUserId: savedTeacher.user,
      createdBy: req.user._id
    }, 'Teacher detail created successfully', 201);
    
  } catch (err) {
    handleError(err, res, 'Failed to create teacher detail');
  }
};

// Get detailTeacher by ID
exports.getDetailTeacherById = async (req, res) => {
  try {
    logControllerAction('Get Teacher Detail', req.user);
    // Check role access
    const roleCheck = checkRoleAccess(req, 'teacher');
    if (!roleCheck.allowed) {
      return res.status(403).json({
        success: false,
        message: roleCheck.message
      });
    }
    // Use centralized populate options
    let query = DetailTeacher.findOne({ user: req.user._id });
    TEACHER_POPULATE_OPTIONS.forEach(opt => { query = query.populate(opt); });
    const detailTeacher = await query;
    if (!detailTeacher) {
      // If no profile exists, return user info and all detailTeacher fields as null
      return sendSuccessResponse(
        res,
        {
          user: {
            fullname: req.user.fullname || '',
            email: req.user.email || '',
            role: req.user.role || '',
            phone: req.user.phone || ''
          },
          qualifications: [],
          experience: [],
          address: [],
          subjectsTaught: [],
          socialMedia: [],
          teacherUserId: req.user._id,
          currentUser: {
            id: req.user._id,
            role: req.user.role
          }
        },
        'Teacher detail not found. Showing basic user info.',
        200
      );
    }
    sendSuccessResponse(res, {
      ...detailTeacher.toObject(),
      teacherUserId: detailTeacher.user,
      currentUser: {
        id: req.user._id,
        role: req.user.role
      }
    }, 'Teacher detail retrieved successfully');
  } catch (err) {
    handleError(err, res, 'Failed to retrieve teacher detail');
  }
};

// Update detailTeacher
exports.updateDetailTeacher = async (req, res) => {
  try {
    logControllerAction('Update Teacher Detail', req.user, { body: req.body });
    
    // Sanitize input
    sanitizeRequest(req);
    
    // Check role access
    const roleCheck = checkRoleAccess(req, 'teacher');
    if (!roleCheck.allowed) {
      return res.status(403).json({
        success: false,
        message: roleCheck.message
      });
    }

    // Check if profile exists
    const { exists } = await checkExistingProfile(DetailTeacher, req.user._id);
    
    if (!exists) {
      // Create new profile if it doesn't exist
      const savedTeacher = await createProfile(
        DetailTeacher, 
        req.body, 
        req.user._id, 
        'user fullname email role phone'
      );
      
      sendSuccessResponse(res, savedTeacher.toObject(), 'Teacher detail created successfully', 201);
    } else {
      // Update existing profile
      const updatedTeacher = await updateProfile(
        DetailTeacher, 
        req.user._id, 
        req.body, 
        {
          user: 'fullname email role phone',
          batches: 'batchName subject',          
        }
      );
      
      sendSuccessResponse(res, updatedTeacher.toObject(), 'Teacher detail updated successfully');
    }
    
  } catch (err) {
    handleError(err, res, 'Failed to update teacher detail');
  }
};

// Delete detailTeacher
exports.deleteDetailTeacher = async (req, res) => {
  try {
    console.log('Delete Teacher Detail - User:', req.user);
    
    // Check if user is a teacher
    if (req.user.role !== 'teacher') {
      console.log('Access denied - User role:', req.user.role);
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only teachers can delete teacher details.'
      });
    }

    const detailTeacher = await DetailTeacher.findOneAndDelete({ user: req.user._id });
    
    console.log('Deleted teacher detail:', detailTeacher ? 'Yes' : 'No');
    
    if (!detailTeacher) {
      return res.status(404).json({ 
        success: false,
        message: 'Teacher detail not found' 
      });
    }
    
    res.json({
      success: true,
      message: 'Teacher detail deleted successfully'
    });
  } catch (err) {
    console.error('Delete Teacher Detail Error:', err);
    res.status(400).json({ 
      success: false,
      message: 'Failed to delete teacher detail',
      error: err.message 
    });
  }
};

