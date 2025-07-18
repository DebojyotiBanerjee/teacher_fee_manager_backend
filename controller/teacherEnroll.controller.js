const TeacherEnrollment = require('../models/batch.models');
const Attendance = require('../models/attendance.models');
const DetailTeacher = require('../models/detailTeacher.models');
const DetailStudent = require('../models/detailStudent.model');

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
    // Check if user is a teacher
    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only teachers can view batches.'
      });
    }
    // Check if teacher has a detail profile
    const teacherDetail = await DetailTeacher.findOne({ user: req.user._id });
    if (!teacherDetail) {
      return res.status(400).json({
        success: false,
        message: 'Teacher detail profile not found. Please create your teacher profile first.',
        requiredAction: 'create_teacher_profile'
      });
    }
    // Only return the batches array
    const batches = await TeacherEnrollment.find({ teacher: req.user._id })
      .populate('students', 'fullname email')
      .sort({ createdAt: -1 });
    res.json(batches);
  } catch (err) {
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
    // Fetch attendance for each student (refactored from getStudentAttendance)
    const teacherDetailId = teacherDetail._id;
    const studentsWithAttendance = await Promise.all(uniqueStudents.map(async (student) => {
      const attendanceRecords = await Attendance.find({
        teacherDetailId,
        student: student._id
      }).sort({ date: -1 });
      return {
        ...student.toObject(),
        attendance: attendanceRecords
      };
    }));
    res.json({
      success: true,
      message: 'Students retrieved successfully',
      data: {
        totalStudents: studentsWithAttendance.length,
        students: studentsWithAttendance,
        teacherDetailId
      }
    });
  } catch (err) {
    res.status(400).json({ 
      success: false,
      message: 'Failed to retrieve students',
      error: err.message 
    });
  }
};