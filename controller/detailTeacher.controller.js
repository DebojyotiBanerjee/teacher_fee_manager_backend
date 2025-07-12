const DetailTeacher = require('../models/detailTeacher.models');
const TeacherEnrollment = require('../models/batch.models');

exports.teacherDashboard = async (req, res) => {
  try {
    console.log('Teacher Dashboard - User:', req.user);
    console.log('Teacher Dashboard - Role:', req.user?.role);
    
    res.status(200).json({
      success: true,
      message: 'Welcome to Teacher Dashboard',
      data: {
        teacherId: req.user._id,
        role: req.user.role
      }
    });
  } catch (err) {
    console.error('Teacher Dashboard Error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
};

// Create a new detailTeacher
exports.createDetailTeacher = async (req, res) => {
  try {
    console.log('Create Teacher Detail - User:', req.user);
    console.log('Create Teacher Detail - User ID:', req.user._id);
    console.log('Create Teacher Detail - Body:', req.body);
    
    // Check if user is a teacher
    if (req.user.role !== 'teacher') {
      console.log('Access denied - User role:', req.user.role);
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only teachers can create teacher details.'
      });
    }

    // Check if teacher detail already exists
    const existingTeacher = await DetailTeacher.findOne({ user: req.user._id });
    if (existingTeacher) {
      console.log('Teacher detail already exists for this user');
      return res.status(409).json({
        success: false,
        message: 'Teacher detail already exists for this user'
      });
    }

    // Automatically assign user ID from JWT token
    const teacherData = { 
      ...req.body, 
      user: req.user._id  // Auto-assign from token
    };
    console.log('Teacher Data to save (with auto-assigned user ID):', teacherData);
    
    const detailTeacher = new DetailTeacher(teacherData);
    await detailTeacher.save();
    
    console.log('Teacher detail created successfully:', detailTeacher._id);
    console.log('Saved teacher detail with user ID:', detailTeacher.user);
    
    // Verify the save by fetching it back with populated user
    const savedTeacher = await DetailTeacher.findById(detailTeacher._id)
      .populate('user', 'fullname email role phone');
    console.log('Verified saved teacher detail:', savedTeacher ? 'Yes' : 'No');
    
    res.status(201).json({
      success: true,
      message: 'Teacher detail created successfully',
      data: {
        ...savedTeacher.toObject(),
        teacherUserId: detailTeacher.user, // Show the auto-assigned user ID
        createdBy: req.user._id
      }
    });
  } catch (err) {
    console.error('Create Teacher Detail Error:', err);
    res.status(400).json({ 
      success: false,
      message: 'Failed to create teacher detail',
      error: err.message 
    });
  }
};

// Get detailTeacher by ID
exports.getDetailTeacherById = async (req, res) => {
  try {
    console.log('Get Teacher Detail - User:', req.user);
    console.log('Get Teacher Detail - User ID:', req.user._id);
    console.log('Get Teacher Detail - User Role:', req.user.role);
    
    // Check if user is a teacher
    if (req.user.role !== 'teacher') {
      console.log('Access denied - User role:', req.user.role);
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only teachers can view teacher details.'
      });
    }

    // First, let's check if any teacher details exist in the database
    const allTeachers = await DetailTeacher.find({});
    console.log('Total teacher details in database:', allTeachers.length);
    console.log('All teacher details:', allTeachers.map(t => ({ id: t._id, userId: t.user })));

    const detailTeacher = await DetailTeacher.findOne({ user: req.user._id })
      .populate('user', 'fullname email role phone')
      .populate('batches', 'batchName subject')
      .populate({
        path: 'ratings',
        select: 'rating comment type',
        options: { limit: 10 } // Limit to avoid large data
      });
    
    console.log('Found teacher detail:', detailTeacher ? 'Yes' : 'No');
    console.log('Query used: { user:', req.user._id, '}');
    
    if (!detailTeacher) {
      return res.status(404).json({ 
        success: false,
        message: 'Teacher detail not found',
        debug: {
          searchedUserId: req.user._id,
          totalTeachersInDB: allTeachers.length,
          currentUserRole: req.user.role
        }
      });
    }
    
    res.json({
      success: true,
      message: 'Teacher detail retrieved successfully',
      data: {
        ...detailTeacher.toObject(),
        teacherUserId: detailTeacher.user, // Show the assigned user ID
        currentUser: {
          id: req.user._id,
          role: req.user.role
        }
      }
    });
  } catch (err) {
    console.error('Get Teacher Detail Error:', err);
    res.status(400).json({ 
      success: false,
      message: 'Failed to retrieve teacher detail',
      error: err.message 
    });
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
    console.log('Update Teacher Detail - User:', req.user);
    console.log('Update Teacher Detail - Body:', req.body);
    
    // Check if user is a teacher
    if (req.user.role !== 'teacher') {
      console.log('Access denied - User role:', req.user.role);
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only teachers can update teacher details.'
      });
    }

    // Check if teacher detail exists
    let detailTeacher = await DetailTeacher.findOne({ user: req.user._id });
    
    if (!detailTeacher) {
      console.log('Teacher detail not found, creating new one');
      // Create new teacher detail if it doesn't exist
      const teacherData = { ...req.body, user: req.user._id };
      detailTeacher = new DetailTeacher(teacherData);
      await detailTeacher.save();
      
      // Populate user data for response
      const savedTeacher = await DetailTeacher.findById(detailTeacher._id)
        .populate('user', 'fullname email role phone');
      
      res.status(201).json({
        success: true,
        message: 'Teacher detail created successfully',
        data: savedTeacher.toObject()
      });
    } else {
      console.log('Teacher detail found, updating existing one');
      // Update existing teacher detail
      detailTeacher = await DetailTeacher.findOneAndUpdate(
        { user: req.user._id }, 
        req.body, 
        { new: true }
      ).populate('user', 'fullname email role phone');
      
      res.json({
        success: true,
        message: 'Teacher detail updated successfully',
        data: detailTeacher.toObject()
      });
    }
    
  } catch (err) {
    console.error('Update Teacher Detail Error:', err);
    res.status(400).json({ 
      success: false,
      message: 'Failed to update teacher detail',
      error: err.message 
    });
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

