const DetailTeacher = require('../models/detailTeacher.models');
const TeacherEnrollment = require('../models/batch.moddels');
const DetailStudent = require('../models/detailStudent.model');

exports.teacherDashboard = async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to Teacher Dashboard'
  });
};

// Create a new detailTeacher
exports.createDetailTeacher = async (req, res) => {
  try {
    const detailTeacher = new DetailTeacher(req.body);
    await detailTeacher.save();
    res.status(201).json(detailTeacher);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get detailTeacher by ID
exports.getDetailTeacherById = async (req, res) => {
  try {
    const detailTeacher = await DetailTeacher.findById(req.user._id).populate('user batches ratings');
    if (!detailTeacher) return res.status(404).json({ error: 'Not found' });
    res.json(detailTeacher);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Update detailTeacher
exports.updateDetailTeacher = async (req, res) => {
  try {
    const detailTeacher = await DetailTeacher.findByIdAndUpdate(req.user._id, req.body, { new: true });
    if (!detailTeacher) return res.status(404).json({ error: 'Not found' });
    res.json(detailTeacher);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete detailTeacher
exports.deleteDetailTeacher = async (req, res) => {
  try {
    const detailTeacher = await DetailTeacher.findByIdAndDelete(req.user._id);
    if (!detailTeacher) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

