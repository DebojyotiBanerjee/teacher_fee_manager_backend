const DetailTeacher = require('../models/detailTeacher.models');
const TeacherEnrollment = require('../models/batch.models');
const { 
  handleError, 
  sendSuccessResponse, 
  checkRoleAccess, 
  checkExistingProfile, 
  createProfile, 
  updateProfile, 
  getProfile, 
  sendDashboardResponse, 
  logControllerAction 
} = require('../utils/controllerUtils');
const { sanitizeRequest } = require('../utils/sanitizer');

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

    const detailTeacher = await getProfile(DetailTeacher, req.user._id, {
      user: 'fullname email role phone',
      batches: 'batchName subject',
      ratings: {
        select: 'rating comment type',
        limit: 10
      }
    });
    
    if (!detailTeacher) {
      return res.status(404).json({ 
        success: false,
        message: 'Teacher detail not found'
      });
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

// Get teacher details with different options
exports.getTeacherDetails = async (req, res) => {
  try {
    console.log('Get Teacher Details - User:', req.user);
    console.log('Get Teacher Details - User ID:', req.user._id);
    console.log('Get Teacher Details - User Role:', req.user.role);
    console.log('Get Teacher Details - Query params:', req.query);
    
    // Check if user is a teacher
    if (req.user.role !== 'teacher') {
      console.log('Access denied - User role:', req.user.role);
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only teachers can view teacher details.'
      });
    }

    const { teacherId, userId, all } = req.query;
    
    // If requesting all teachers (admin functionality)
    if (all === 'true') {
      console.log('Getting all teacher details');
      const allTeachers = await DetailTeacher.find({})
        .populate('user', 'fullname email role phone')
        .populate('batches', 'batchName subject')
        .sort({ createdAt: -1 });
      
      return res.json({
        success: true,
        message: 'All teacher details retrieved successfully',
        data: {
          totalTeachers: allTeachers.length,
          teachers: allTeachers
        }
      });
    }
    
    // If requesting by specific teacher ID
    if (teacherId) {
      console.log('Getting teacher detail by teacher ID:', teacherId);
      const detailTeacher = await DetailTeacher.findById(teacherId)
        .populate('user', 'fullname email role phone')
        .populate('batches', 'batchName subject')
        .populate({
          path: 'ratings',
          select: 'rating comment type',
          options: { limit: 10 }
        });
      
      if (!detailTeacher) {
        return res.status(404).json({
          success: false,
          message: 'Teacher detail not found with the provided ID'
        });
      }
      
      return res.json({
        success: true,
        message: 'Teacher detail retrieved successfully',
        data: {
          ...detailTeacher.toObject(),
          teacherUserId: detailTeacher.user,
          currentUser: {
            id: req.user._id,
            role: req.user.role
          }
        }
      });
    }
    
    // If requesting by user ID
    if (userId) {
      console.log('Getting teacher detail by user ID:', userId);
      const detailTeacher = await DetailTeacher.findOne({ user: userId })
        .populate('user', 'fullname email role phone')
        .populate('batches', 'batchName subject')
        .populate({
          path: 'ratings',
          select: 'rating comment type',
          options: { limit: 10 }
        });
      
      if (!detailTeacher) {
        return res.status(404).json({
          success: false,
          message: 'Teacher detail not found for the provided user ID'
        });
      }
      
      return res.json({
        success: true,
        message: 'Teacher detail retrieved successfully',
        data: {
          ...detailTeacher.toObject(),
          teacherUserId: detailTeacher.user,
          currentUser: {
            id: req.user._id,
            role: req.user.role
          }
        }
      });
    }
    
    // Default: Get current teacher's detail
    console.log('Getting current teacher detail');
    const detailTeacher = await DetailTeacher.findOne({ user: req.user._id })
      .populate('user', 'fullname email role phone')
      .populate('batches', 'batchName subject')
      .populate({
        path: 'ratings',
        select: 'rating comment type',
        options: { limit: 10 }
      });
    
    if (!detailTeacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher detail not found for current user',
        debug: {
          searchedUserId: req.user._id,
          currentUserRole: req.user.role
        }
      });
    }
    
    res.json({
      success: true,
      message: 'Teacher detail retrieved successfully',
      data: {
        ...detailTeacher.toObject(),
        teacherUserId: detailTeacher.user,
        currentUser: {
          id: req.user._id,
          role: req.user.role
        }
      }
    });
    
  } catch (err) {
    console.error('Get Teacher Details Error:', err);
    res.status(400).json({
      success: false,
      message: 'Failed to retrieve teacher details',
      error: err.message
    });
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
    const { exists, profile } = await checkExistingProfile(DetailTeacher, req.user._id);
    
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
          ratings: {
            select: 'rating comment type',
            limit: 10
          }
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

