const DetailStudent = require('../models/detailStudent.model');

exports.studentDashboard = async (req, res) => {
  try {
    console.log('Student Dashboard - User:', req.user);
    console.log('Student Dashboard - Role:', req.user?.role);
    
    res.status(200).json({
      success: true,
      message: 'Welcome to Student Dashboard',
      data: {
        studentId: req.user._id,
        role: req.user.role
      }
    });
  } catch (err) {
    console.error('Student Dashboard Error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message
    });
  }
};

// Create a new detailStudent
exports.createDetailStudent = async (req, res) => {
  try {
    console.log('Create Student Detail - User:', req.user);
    console.log('Create Student Detail - User ID:', req.user._id);
    console.log('Create Student Detail - Body:', req.body);
    
    // Check if user is a student
    if (req.user.role !== 'student') {
      console.log('Access denied - User role:', req.user.role);
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only students can create student details.'
      });
    }

    // Check if student detail already exists
    const existingStudent = await DetailStudent.findOne({ user: req.user._id });
    if (existingStudent) {
      console.log('Student detail already exists for this user');
      return res.status(409).json({
        success: false,
        message: 'Student detail already exists for this user'
      });
    }

    // Automatically assign user ID from JWT token
    const studentData = {
      user: req.user._id,  // Auto-assign from token
      ...req.body  // Include all the request body data
    };
    console.log('Student Data to save (with auto-assigned user ID):', studentData);
    
    const detailStudent = new DetailStudent(studentData);
    await detailStudent.save();
    
    console.log('Student detail created successfully:', detailStudent._id);
    console.log('Saved student detail with user ID:', detailStudent.user);
    
    // Verify the save by fetching it back
    const savedStudent = await DetailStudent.findById(detailStudent._id);
    console.log('Verified saved student detail:', savedStudent ? 'Yes' : 'No');
    
    res.status(201).json({
      success: true,
      message: 'Student detail created successfully',
      data: {
        ...detailStudent.toObject(),
        studentUserId: detailStudent.user, // Show the auto-assigned user ID
        createdBy: req.user._id
      }
    });
  } catch (err) {
    console.error('Create Student Detail Error:', err);
    res.status(400).json({ 
      success: false,
      message: 'Failed to create student detail',
      error: err.message 
    });
  }
};

// Get detailStudent by ID
exports.getDetailStudentById = async (req, res) => {
  try {
    console.log('Get Student Detail - User:', req.user);
    console.log('Get Student Detail - User ID:', req.user._id);
    console.log('Get Student Detail - User Role:', req.user.role);
    
    // Check if user is a student
    if (req.user.role !== 'student') {
      console.log('Access denied - User role:', req.user.role);
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only students can view student details.'
      });
    }

    // First, let's check if any student details exist in the database
    const allStudents = await DetailStudent.find({});
    console.log('Total student details in database:', allStudents.length);
    console.log('All student details:', allStudents.map(s => ({ id: s._id, userId: s.user })));

    const detailStudent = await DetailStudent.findOne({ user: req.user._id })
      .populate('user', 'fullname email role')
      .populate('enrolledBatches.batch', 'batchName subject')
      .populate('subjects.subject', 'name');
    
    console.log('Found student detail:', detailStudent ? 'Yes' : 'No');
    console.log('Query used: { user:', req.user._id, '}');
    
    if (!detailStudent) {
      return res.status(404).json({ 
        success: false,
        message: 'Student detail not found',
        debug: {
          searchedUserId: req.user._id,
          totalStudentsInDB: allStudents.length,
          currentUserRole: req.user.role
        }
      });
    }
    
    res.json({
      success: true,
      message: 'Student detail retrieved successfully',
      data: {
        ...detailStudent.toObject(),
        studentUserId: detailStudent.user, // Show the assigned user ID
        currentUser: {
          id: req.user._id,
          role: req.user.role
        }
      }
    });
  } catch (err) {
    console.error('Get Student Detail Error:', err);
    res.status(400).json({ 
      success: false,
      message: 'Failed to retrieve student detail',
      error: err.message 
    });
  }
};

// Update detailStudent
exports.updateDetailStudent = async (req, res) => {
  try {
    console.log('Update Student Detail - User:', req.user);
    console.log('Update Student Detail - Body:', req.body);
    
    // Check if user is a student
    if (req.user.role !== 'student') {
      console.log('Access denied - User role:', req.user.role);
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only students can update student details.'
      });
    }

    // Check if student detail exists
    let detailStudent = await DetailStudent.findOne({ user: req.user._id });
    
    if (!detailStudent) {
      console.log('Student detail not found, creating new one');
      // Create new student detail if it doesn't exist
      const studentData = {
        user: req.user._id,
        education: req.body.education,
        subjects: req.body.subjects,
        enrolledBatches: []
      };
      detailStudent = new DetailStudent(studentData);
      await detailStudent.save();
      
      res.status(201).json({
        success: true,
        message: 'Student detail created successfully',
        data: detailStudent
      });
    } else {
      console.log('Student detail found, updating existing one');
      // Update existing student detail
      detailStudent = await DetailStudent.findOneAndUpdate(
        { user: req.user._id }, 
        req.body, 
        { new: true }
      );
      
      res.json({
        success: true,
        message: 'Student detail updated successfully',
        data: detailStudent
      });
    }
    
  } catch (err) {
    console.error('Update Student Detail Error:', err);
    res.status(400).json({ 
      success: false,
      message: 'Failed to update student detail',
      error: err.message 
    });
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