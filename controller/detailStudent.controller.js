const { findById } = require('../models/batch.models');
const DetailStudent = require('../models/detailStudent.model');
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

exports.studentDashboard = async (req, res) => {
  try {
    logControllerAction('Student Dashboard', req.user);
    sendDashboardResponse(res, req.user._id, req.user.role);
  } catch (err) {
    handleError(err, res, 'Dashboard error');
  }
};

// Create a new detailStudent
exports.createDetailStudent = async (req, res) => {
  try {
    logControllerAction('Create Student Detail', req.user, { body: req.body });
    
    // Sanitize input
    sanitizeRequest(req);
    
    // Check role access
    const roleCheck = checkRoleAccess(req, 'student');
    if (!roleCheck.allowed) {
      return res.status(403).json({
        success: false,
        message: roleCheck.message
      });
    }

    // Check if profile already exists
    const {exists} = await checkExistingProfile(DetailStudent, req.user._id);
    if (exists) {
      return res.status(409).json({
        success: false,
        message: 'Student detail already exists for this user'
      });
    }

    // Create profile with populated user
    const savedStudent = await createProfile(
      DetailStudent, 
      req.body, 
      req.user._id, 
      'user fullname email role phone'
    );
    
    sendSuccessResponse(res, {
      ...savedStudent.toObject(),
      studentUserId: savedStudent.user,
      createdBy: req.user._id
    }, 'Student detail created successfully', 201);
    
  } catch (err) {
    handleError(err, res, 'Failed to create student detail');
  }
};

// Get detailStudent by ID
exports.getDetailStudentById = async (req, res) => {
  try {
    logControllerAction('Get Student Detail', req.user);

    // Check role access
    const roleCheck = checkRoleAccess(req, 'student');
    if (!roleCheck.allowed) {
      return res.status(403).json({
        success: false,
        message: roleCheck.message
      });
    }

    // Try to get the student detail profile
    const detailStudent = await getProfile(DetailStudent, req.user._id, {
      user: 'fullname email role phone',
      enrolledBatches: 'batchName subject',
      subjects: 'name'
    });

    if (!detailStudent) {
      // If no profile exists, return user info and empty student detail fields
      return sendSuccessResponse(
        res,
        {
          user: {
            fullname: req.user.fullname || '',
            email: req.user.email || '',
            role: req.user.role || '',
            phone: req.user.phone || ''
          },
          enrolledBatches: [],
          subjects: [],
          studentUserId: req.user._id,
          currentUser: {
            id: req.user._id,
            role: req.user.role
          }
        },
        'Student detail not found. Showing basic user info.',
        200
      );
    }

    // If profile exists, return the full detail
    sendSuccessResponse(res, {
      ...detailStudent.toObject(),
      studentUserId: detailStudent.user,
      currentUser: {
        id: req.user._id,
        role: req.user.role
      }
    }, 'Student detail retrieved successfully');
  } catch (err) {
    handleError(err, res, 'Failed to retrieve student detail');
  }
};

// Update detailStudent
exports.updateDetailStudent = async (req, res) => {
  try {
    logControllerAction('Update Student Detail', req.user, { body: req.body });
    
    // Sanitize input
    sanitizeRequest(req);
    
    // Check role access
    const roleCheck = checkRoleAccess(req, 'student');
    if (!roleCheck.allowed) {
      return res.status(403).json({
        success: false,
        message: roleCheck.message
      });
    }

    // Check if profile exists
    const { exists, profile } = await checkExistingProfile(DetailStudent, req.user._id);
    
    if (!exists) {
      // Create new profile if it doesn't exist
      const savedStudent = await createProfile(
        DetailStudent, 
        req.body, 
        req.user._id, 
        'user fullname email role phone'
      );
      
      sendSuccessResponse(res, savedStudent.toObject(), 'Student detail created successfully', 201);
    } else {
      // Update existing profile
      const updatedStudent = await updateProfile(
        DetailStudent, 
        req.user._id, 
        req.body, 
        {
          user: 'fullname email role phone',
          enrolledBatches: 'batchName subject',
          subjects: 'name'
        }
      );
      
      sendSuccessResponse(res, updatedStudent.toObject(), 'Student detail updated successfully');
    }
    
  } catch (err) {
    handleError(err, res, 'Failed to update student detail');
  }
};

// Delete detailStudent
exports.deleteDetailStudent = async (req, res) => {
  try {
    console.log('Delete Student Detail - User:', req.user);
    console.log('Delete Student Detail - User ID:', req.user._id);
    
    // Check if user is a student
    if (req.user.role !== 'student') {
      console.log('Access denied - User role:', req.user.role);
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only students can delete student details.'
      });
    }

    // First check if student detail exists
    const existingStudent = await DetailStudent.findOne({ user: req.user._id });
    console.log('Existing student detail found:', existingStudent ? 'Yes' : 'No');
    
    if (!existingStudent) {
      console.log('No student detail found to delete');
      return res.status(404).json({ 
        success: false,
        message: 'Student detail not found. Nothing to delete.' 
      });
    }

    // Delete the student detail
    const detailStudent = await DetailStudent.findOneAndDelete({ user: req.user._id });
    
    console.log('Deleted student detail:', detailStudent ? 'Yes' : 'No');
    console.log('Deleted student detail ID:', detailStudent?._id);
    
    res.json({
      success: true,
      message: 'Student detail deleted successfully',
      data: {
        deletedStudentId: detailStudent._id,
        deletedAt: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('Delete Student Detail Error:', err);
    res.status(400).json({ 
      success: false,
      message: 'Failed to delete student detail',
      error: err.message 
    });
  }
};