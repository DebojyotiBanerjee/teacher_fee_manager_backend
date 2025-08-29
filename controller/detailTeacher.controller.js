const DetailTeacher = require('../models/detailTeacher.models');
const { 
  handleError, 
  sendSuccessResponse, 
  checkRoleAccess, 
  checkExistingProfile, 
  createProfile, 
  updateProfile,    
  sendDashboardResponse, 
  logControllerAction,
  softDelete
} = require('../utils/controllerUtils');
const { sanitizeRequest } = require('../utils/sanitizer');

// Centralized populate options for teacher detail
const TEACHER_POPULATE_OPTIONS = [
  { path: 'user', select: 'fullname email role phone' }
];

// Helper to check if all required fields are present for profile completeness
function isTeacherProfileComplete(body) {
  return (
    Array.isArray(body.qualifications) && body.qualifications.length > 0 &&
    body.qualifications.every(q => q.degree && q.institution) &&
    body.experience && typeof body.experience.years === 'number' &&
    Array.isArray(body.experience.previousInstitutions) &&
    body.address && body.address.street && body.address.city && body.address.state && body.address.pincode &&
    Array.isArray(body.subjectsTaught) && body.subjectsTaught.length > 0
  );
}

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
    
    // Destructure request body for clear testing
    const { gender, qualifications, experience, address, subjectsTaught, socialMedia, profilePic, dob } = req.body;
    
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

    // Automatically set isProfileComplete
    const teacherData = { gender, qualifications, experience, address, subjectsTaught, socialMedia, profilePic, dob };
    teacherData.isProfileComplete = isTeacherProfileComplete(teacherData);
    
    // Create profile with populated user
    const savedTeacher = await createProfile(
      DetailTeacher, 
      teacherData, 
      req.user._id
    );
    
    sendSuccessResponse(res, {
      ...savedTeacher.toObject()
      
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

    // Try to find the teacher detail profile
    let query = DetailTeacher.findOne({ user: req.user._id, isDeleted: false });
    TEACHER_POPULATE_OPTIONS.forEach(opt => { query = query.populate(opt); });
    const detailTeacher = await query;

    if (!detailTeacher) {
      // If no profile exists, return only the registration fields (basic user info), rest as empty values
      return sendSuccessResponse(
        res,
        {
          user: {
            fullname: req.user.fullname || '',
            email: req.user.email || '',
            role: req.user.role || '',
            phone: req.user.phone || ''
          },
          gender:'',
          qualifications: [],
          experience: {},
          address: {},
          subjectsTaught: [],
          socialMedia: {},
          profilePic: '',
          teacherUserId: req.user._id,
          currentUser: {
            id: req.user._id,
            role: req.user.role
          }
        },
        'No teacher profile found. Showing registration details only.',
        200
      );
    }

    // If profile exists, return the full detail
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

    // Destructure request body for clear testing
    const { fullname, phone, gender, qualifications, experience, address, subjectsTaught, socialMedia, profilePic, dob } = req.body;

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

    // Prevent updating email and role fields
    if ('email' in req.body) delete req.body.email;
    if ('role' in req.body) delete req.body.role;

    // Automatically set isProfileComplete
    const teacherData = { gender, qualifications, experience, address, subjectsTaught, socialMedia, profilePic, dob };
    teacherData.isProfileComplete = isTeacherProfileComplete(teacherData);

    if (!exists) {
      // If no profile exists, allow updating registered fields except email and role
      // Update user fields except email and role
      const allowedUserFields = ['fullname', 'phone'];
      const userUpdate = {};
      allowedUserFields.forEach(field => {
        if (field in req.body) userUpdate[field] = req.body[field];
      });

      // Update user document
      if (Object.keys(userUpdate).length > 0) {
        await require('../models/user.models').findByIdAndUpdate(
          req.user._id,
          { $set: userUpdate },
          { new: true }
        );
      }

      // Create new teacher detail profile
      const savedTeacher = await createProfile(
        DetailTeacher,
        teacherData,
        req.user._id,
        
      );

      sendSuccessResponse(res, savedTeacher.toObject(), 'Teacher detail created successfully', 201);
    } else {
      // Update existing profile
      // Prevent updating email and role in user subdocument
      const allowedUserFields = ['fullname', 'phone'];
      const userUpdate = {};
      allowedUserFields.forEach(field => {
        if (field in req.body) userUpdate[field] = req.body[field];
      });

      // Update user document
      if (Object.keys(userUpdate).length > 0) {
        await require('../models/user.models').findByIdAndUpdate(
          req.user._id,
          { $set: userUpdate },
          { new: true }
        );
      }

      const updatedTeacher = await updateProfile(
        DetailTeacher,
        req.user._id,
        teacherData,
        {
          user: 'fullname email role phone'
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

    const detailTeacher = await softDelete(DetailTeacher, { user: req.user._id, isDeleted: false });
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

module.exports = {
  teacherDashboard: exports.teacherDashboard,
  createDetailTeacher: exports.createDetailTeacher,
  getDetailTeacherById: exports.getDetailTeacherById,
  updateDetailTeacher: exports.updateDetailTeacher,
  deleteDetailTeacher: exports.deleteDetailTeacher,
  isTeacherProfileComplete
};

