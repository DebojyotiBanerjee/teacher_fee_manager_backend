const TeacherEnrollment = require('../models/batch.models');
const Attendance = require('../models/attendance.models');
const DetailTeacher = require('../models/detailTeacher.models');
const DetailStudent = require('../models/detailStudent.model');

// Get teacher's batch information
exports.getTeacherBatches = async (req, res) => {
  try {
    console.log('Get Teacher Batches - User:', req.user);
    console.log('Get Teacher Batches - User ID:', req.user._id);
    console.log('Get Teacher Batches - User Role:', req.user.role);
    
    // Check if user is a teacher
    if (req.user.role !== 'teacher') {
      console.log('Access denied - User role:', req.user.role);
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only teachers can view batch information.'
      });
    }

    // Check if teacher has a detail profile
    const teacherDetail = await DetailTeacher.findOne({ user: req.user._id });
    if (!teacherDetail) {
      console.log('Teacher detail profile not found for user:', req.user._id);
      return res.status(400).json({
        success: false,
        message: 'Teacher detail profile not found. Please create your teacher profile first.',
        requiredAction: 'create_teacher_profile'
      });
    }

    console.log('Teacher detail profile found:', teacherDetail._id);

    // Get all batches for this teacher
    const batches = await TeacherEnrollment.find({ teacher: req.user._id })
      .populate('students', 'fullname email')
      .sort({ createdAt: -1 });

    // Get teacher's basic information
    const teacherInfo = {
      teacherDetailId: teacherDetail._id,
      qualifications: teacherDetail.qualifications,
      subjectsTaught: teacherDetail.subjectsTaught,
      experience: teacherDetail.experience,
      bio: teacherDetail.bio,
      averageRating: teacherDetail.averageRating,
      totalRatings: teacherDetail.totalRatings
    };

    console.log('Get Teacher Batches - Found batches:', batches.length);
    
    res.json({
      success: true,
      message: 'Teacher batch information retrieved successfully',
      data: {
        teacherInfo,
        totalBatches: batches.length,
        batches,
        teacherDetailId: teacherDetail._id
      }
    });
  } catch (err) {
    console.error('Get Teacher Batches Error:', err);
    res.status(400).json({ 
      success: false,
      message: 'Failed to retrieve teacher batch information',
      error: err.message 
    });
  }
};

// Mark attendance for a student
exports.markAttendance = async (req, res) => {
  try {
    console.log('Mark Attendance - User:', req.user);
    console.log('Mark Attendance - User ID:', req.user._id);
    console.log('Mark Attendance - User Role:', req.user.role);
    console.log('Mark Attendance - Request body:', req.body);
    
    // Check if user is a teacher
    if (req.user.role !== 'teacher') {
      console.log('Access denied - User role:', req.user.role);
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only teachers can mark attendance.'
      });
    }

    // Check if teacher has a detail profile
    const teacherDetail = await DetailTeacher.findOne({ user: req.user._id });
    if (!teacherDetail) {
      console.log('Teacher detail profile not found for user:', req.user._id);
      return res.status(400).json({
        success: false,
        message: 'Teacher detail profile not found. Please create your teacher profile first.',
        requiredAction: 'create_teacher_profile'
      });
    }

    console.log('Teacher detail profile found:', teacherDetail._id);

    const { studentId, date, status, notes } = req.body;

    // Validate required fields
    if (!studentId || !date || !status) {
      return res.status(400).json({
        success: false,
        message: 'Student ID, Date, and Status are required'
      });
    }

    // Validate status
    const validStatuses = ['present', 'absent', 'late', 'excused'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: present, absent, late, excused'
      });
    }

    // Check if student exists
    const student = await DetailStudent.findById(studentId);
    if (!student) {
      console.log('Student not found');
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    console.log('Student found:', student.user);

    // Check if attendance already exists for this student, teacher, and date
    const existingAttendance = await Attendance.findOne({
      teacherDetailId: teacherDetail._id,
      student: studentId,
      date: new Date(date)
    });

    if (existingAttendance) {
      console.log('Attendance already exists for this date, updating...');
      // Update existing attendance
      existingAttendance.status = status;
      if (notes) existingAttendance.notes = notes;
      await existingAttendance.save();

      return res.json({
        success: true,
        message: 'Attendance updated successfully',
        data: {
          attendance: existingAttendance,
          studentName: student.user,
          teacherDetailId: teacherDetail._id
        }
      });
    }

    // Create new attendance record
    const attendanceData = {
      teacherDetailId: teacherDetail._id,
      student: studentId,
      date: new Date(date),
      status,
      notes: notes || ''
    };

    console.log('Creating new attendance record:', attendanceData);

    const attendance = new Attendance(attendanceData);
    await attendance.save();

    console.log('Attendance marked successfully:', attendance._id);

    res.status(201).json({
      success: true,
      message: 'Attendance marked successfully',
      data: {
        attendance,
        studentName: student.user,
        teacherDetailId: teacherDetail._id
      }
    });

  } catch (err) {
    console.error('Mark Attendance Error:', err);
    res.status(400).json({ 
      success: false,
      message: 'Failed to mark attendance',
      error: err.message 
    });
  }
};

// Get attendance for a specific student
exports.getStudentAttendance = async (req, res) => {
  try {
    console.log('Get Student Attendance - User:', req.user);
    console.log('Get Student Attendance - User ID:', req.user._id);
    console.log('Get Student Attendance - User Role:', req.user.role);
    
    // Check if user is a teacher
    if (req.user.role !== 'teacher') {
      console.log('Access denied - User role:', req.user.role);
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only teachers can view attendance.'
      });
    }

    // Check if teacher has a detail profile
    const teacherDetail = await DetailTeacher.findOne({ user: req.user._id });
    if (!teacherDetail) {
      console.log('Teacher detail profile not found for user:', req.user._id);
      return res.status(400).json({
        success: false,
        message: 'Teacher detail profile not found. Please create your teacher profile first.',
        requiredAction: 'create_teacher_profile'
      });
    }

    console.log('Teacher detail profile found:', teacherDetail._id);

    const { studentId } = req.query;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: 'Student ID is required'
      });
    }

    // Check if student exists
    const student = await DetailStudent.findById(studentId);
    if (!student) {
      console.log('Student not found');
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    console.log('Student found:', student.user);

    // Get attendance for this student and teacher
    const attendanceRecords = await Attendance.find({
      teacherDetailId: teacherDetail._id,
      student: studentId
    }).sort({ date: -1 });

    console.log('Found attendance records for student:', attendanceRecords.length);

    res.json({
      success: true,
      message: 'Student attendance records retrieved successfully',
      data: {
        studentName: student.user,
        totalRecords: attendanceRecords.length,
        attendance: attendanceRecords,
        teacherDetailId: teacherDetail._id
      }
    });

  } catch (err) {
    console.error('Get Student Attendance Error:', err);
    res.status(400).json({ 
      success: false,
      message: 'Failed to retrieve student attendance records',
      error: err.message 
    });
  }
};

// Create a new batch (enrollment)
exports.createBatch = async (req, res) => {
  try {
    console.log('Create Batch - User:', req.user);
    console.log('Create Batch - User ID:', req.user._id);
    console.log('Create Batch - User Role:', req.user.role);
    console.log('Create Batch - Request body:', req.body);
    
    // Check if user is a teacher
    if (req.user.role !== 'teacher') {
      console.log('Access denied - User role:', req.user.role);
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only teachers can create batches.'
      });
    }

    // Check if teacher has a detail profile and get the existing teacher detail ID
    const teacherDetail = await DetailTeacher.findOne({ user: req.user._id });
    if (!teacherDetail) {
      console.log('Teacher detail profile not found for user:', req.user._id);
      return res.status(400).json({
        success: false,
        message: 'Teacher detail profile not found. Please create your teacher profile first.',
        requiredAction: 'create_teacher_profile'
      });
    }

    console.log('Teacher detail profile found:', teacherDetail._id);
    console.log('Using existing teacher detail ID:', teacherDetail._id);

    // Auto-assign teacher ID from JWT token and use existing teacher detail ID
    const batchData = { 
      ...req.body, 
      teacher: req.user._id,
      teacherDetailId: teacherDetail._id // Use existing teacher detail ID
    };
    console.log('Create Batch - Batch data with existing teacher detail ID:', batchData);
    
    const batch = new TeacherEnrollment(batchData);
    console.log('Create Batch - New batch object created');
    
    await batch.save();
    console.log('Create Batch - Batch saved successfully');
    console.log('Create Batch - Batch teacher ID:', batch.teacher);
    console.log('Create Batch - Batch teacher detail ID:', batch.teacherDetailId);
    
    res.status(201).json({
      success: true,
      message: 'Batch created successfully',
      data: {
        ...batch.toObject(),
        teacherDetailId: teacherDetail._id, // Use existing teacher detail ID
        createdBy: req.user._id
      }
    });
  } catch (err) {
    console.error('Create Batch Error:', err);
    res.status(400).json({ 
      success: false,
      message: 'Failed to create batch',
      error: err.message 
    });
  }
};

// Update teacher's batches 
exports.updateBatch = async (req, res) => {
  try {
    console.log('Update Batch - User:', req.user);
    console.log('Update Batch - User ID:', req.user._id);
    console.log('Update Batch - User Role:', req.user.role);
    console.log('Update Batch - Request body:', req.body);
    
    // Check if user is a teacher
    if (req.user.role !== 'teacher') {
      console.log('Access denied - User role:', req.user.role);
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only teachers can update batches.'
      });
    }

    // Check if teacher has a detail profile
    const teacherDetail = await DetailTeacher.findOne({ user: req.user._id });
    if (!teacherDetail) {
      console.log('Teacher detail profile not found for user:', req.user._id);
      return res.status(400).json({
        success: false,
        message: 'Teacher detail profile not found. Please create your teacher profile first.',
        requiredAction: 'create_teacher_profile'
      });
    }

    console.log('Teacher detail profile found:', teacherDetail._id);

    // Update all batches belonging to this teacher
    const updatedBatches = await TeacherEnrollment.updateMany(
      { teacher: req.user._id },
      req.body,
      { new: true }
    );
    
    console.log('Update Batch - Updated batches count:', updatedBatches.modifiedCount);
    
    if (updatedBatches.modifiedCount === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'No batches found for this teacher' 
      });
    }
    
    res.json({
      success: true,
      message: 'Batches updated successfully',
      data: {
        updatedCount: updatedBatches.modifiedCount,
        teacherDetailId: teacherDetail._id
      }
    });
  } catch (err) {
    console.error('Update Batch Error:', err);
    res.status(400).json({ 
      success: false,
      message: 'Failed to update batches',
      error: err.message 
    });
  }
};

// Delete all teacher's batches (no batch ID required)
exports.deleteBatch = async (req, res) => {
  try {
    console.log('Delete Batch - User:', req.user);
    console.log('Delete Batch - User ID:', req.user._id);
    console.log('Delete Batch - User Role:', req.user.role);
    
    // Check if user is a teacher
    if (req.user.role !== 'teacher') {
      console.log('Access denied - User role:', req.user.role);
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only teachers can delete batches.'
      });
    }

    // Check if teacher has a detail profile
    const teacherDetail = await DetailTeacher.findOne({ user: req.user._id });
    if (!teacherDetail) {
      console.log('Teacher detail profile not found for user:', req.user._id);
      return res.status(400).json({
        success: false,
        message: 'Teacher detail profile not found. Please create your teacher profile first.',
        requiredAction: 'create_teacher_profile'
      });
    }

    console.log('Teacher detail profile found:', teacherDetail._id);

    const deletedBatches = await TeacherEnrollment.deleteMany({ teacher: req.user._id });
    
    console.log('Delete Batch - Deleted batches count:', deletedBatches.deletedCount);
    
    if (deletedBatches.deletedCount === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'No batches found for this teacher' 
      });
    }
    
    res.json({
      success: true,
      message: 'All batches deleted successfully',
      data: {
        deletedCount: deletedBatches.deletedCount,
        teacherDetailId: teacherDetail._id
      }
    });
  } catch (err) {
    console.error('Delete Batch Error:', err);
    res.status(400).json({ 
      success: false,
      message: 'Failed to delete batches',
      error: err.message 
    });
  }
};

// View all batches for the logged-in teacher
exports.viewMyBatches = async (req, res) => {
  try {
    console.log('View My Batches - User:', req.user);
    console.log('View My Batches - User ID:', req.user._id);
    console.log('View My Batches - User Role:', req.user.role);
    
    // Check if user is a teacher
    if (req.user.role !== 'teacher') {
      console.log('Access denied - User role:', req.user.role);
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only teachers can view batches.'
      });
    }

    // Check if teacher has a detail profile
    const teacherDetail = await DetailTeacher.findOne({ user: req.user._id });
    if (!teacherDetail) {
      console.log('Teacher detail profile not found for user:', req.user._id);
      return res.status(400).json({
        success: false,
        message: 'Teacher detail profile not found. Please create your teacher profile first.',
        requiredAction: 'create_teacher_profile'
      });
    }

    console.log('Teacher detail profile found:', teacherDetail._id);

    const batches = await TeacherEnrollment.find({ teacher: req.user._id })
      .populate('students', 'fullname email')
      .sort({ createdAt: -1 });
    
    console.log('View My Batches - Found batches:', batches.length);
    
    res.json({
      success: true,
      message: 'Batches retrieved successfully',
      data: {
        totalBatches: batches.length,
        batches,
        teacherDetailId: teacherDetail._id
      }
    });
  } catch (err) {
    console.error('View My Batches Error:', err);
    res.status(400).json({ 
      success: false,
      message: 'Failed to retrieve batches',
      error: err.message 
    });
  }
};

// View students in all batches for the logged-in teacher
exports.viewStudentsInBatch = async (req, res) => {
  try {
    console.log('View Students In Batch - User:', req.user);
    console.log('View Students In Batch - User ID:', req.user._id);
    console.log('View Students In Batch - User Role:', req.user.role);
    
    // Check if user is a teacher
    if (req.user.role !== 'teacher') {
      console.log('Access denied - User role:', req.user.role);
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only teachers can view students.'
      });
    }

    // Check if teacher has a detail profile
    const teacherDetail = await DetailTeacher.findOne({ user: req.user._id });
    if (!teacherDetail) {
      console.log('Teacher detail profile not found for user:', req.user._id);
      return res.status(400).json({
        success: false,
        message: 'Teacher detail profile not found. Please create your teacher profile first.',
        requiredAction: 'create_teacher_profile'
      });
    }

    console.log('Teacher detail profile found:', teacherDetail._id);

    const batches = await TeacherEnrollment.find({ teacher: req.user._id })
      .populate('students', 'fullname email phone');
    
    const students = batches.flatMap(batch => batch.students);
    const uniqueStudents = students.filter((student, index, self) => 
      index === self.findIndex(s => s._id.toString() === student._id.toString())
    );
    
    console.log('View Students In Batch - Found unique students:', uniqueStudents.length);
    
    res.json({
      success: true,
      message: 'Students retrieved successfully',
      data: {
        totalStudents: uniqueStudents.length,
        students: uniqueStudents,
        teacherDetailId: teacherDetail._id
      }
    });
  } catch (err) {
    console.error('View Students In Batch Error:', err);
    res.status(400).json({ 
      success: false,
      message: 'Failed to retrieve students',
      error: err.message 
    });
  }
};