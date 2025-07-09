const TeacherEnrollment = require('../models/batch.moddels');
const Attendance = require('../models/attendance.models');

// Middleware to check if user is a teacher
function isTeacher(req, res, next) {
  if (req.User && req.user.role === 'teacher') {
    return next();
  }
  return res.status(403).json({ error: 'Access denied. Only teachers allowed.' });
}

// Create a new batch (enrollment)
exports.createBatch = async (req, res) => {
  try {
    const batchData = { ...req.body, teacher: req.user._id };
    const batch = new TeacherEnrollment(batchData);
    await batch.save();
    res.status(201).json(batch);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Update a batch
exports.updateBatch = async (req, res) => {
  try {
    const batch = await TeacherEnrollment.findOneAndUpdate(
      { teacher: req.user._id },
      req.body,
      { new: true }
    );
    if (!batch) return res.status(404).json({ error: 'Batch not found or unauthorized' });
    res.json(batch);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete a batch
exports.deleteBatch = async (req, res) => {
  try {
    const batch = await TeacherEnrollment.findOneAndDelete({ teacher: req.user._id });
    if (!batch) return res.status(404).json({ error: 'Batch not found or unauthorized' });
    res.json({ message: 'Batch deleted successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// View all batches for the logged-in teacher
exports.viewMyBatches = [isTeacher, async (req, res) => {
  try {
    const batches = await TeacherEnrollment.find({ teacher: req.user._id });
    res.json(batches);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}];

// View students in all batches for the logged-in teacher
exports.viewStudentsInBatch = [isTeacher, async (req, res) => {
  try {
    const batches = await TeacherEnrollment.find({ teacher: req.user._id }).populate('students');
    const students = batches.flatMap(batch => batch.students);
    res.json({ students });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}];

// View attendance for all batches for the logged-in teacher
exports.viewBatchAttendance = [isTeacher, async (req, res) => {
  try {
    // Find all batches for the teacher
    const batches = await TeacherEnrollment.find({ teacher: req.user._id });
    const batchIds = batches.map(batch => batch._id);
    const attendanceRecords = await Attendance.find({ batch: { $in: batchIds } }).populate('student', 'fullname email');
    res.json({ attendance: attendanceRecords });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}];