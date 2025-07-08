const DetailTeacher = require('../models/detailTeacher.models');
const TeacherEnrollment = require('../models/batch.models');

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
    const detailTeacher = await DetailTeacher.findById(req.params.id).populate('user batches ratings');
    if (!detailTeacher) return res.status(404).json({ error: 'Not found' });
    res.json(detailTeacher);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Update detailTeacher
exports.updateDetailTeacher = async (req, res) => {
  try {
    const detailTeacher = await DetailTeacher.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!detailTeacher) return res.status(404).json({ error: 'Not found' });
    res.json(detailTeacher);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete detailTeacher
exports.deleteDetailTeacher = async (req, res) => {
  try {
    const detailTeacher = await DetailTeacher.findByIdAndDelete(req.params.id);
    if (!detailTeacher) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

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
      { _id: req.params.id, teacher: req.user._id },
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
    const batch = await TeacherEnrollment.findOneAndDelete({ _id: req.params.id, teacher: req.user._id });
    if (!batch) return res.status(404).json({ error: 'Batch not found or unauthorized' });
    res.json({ message: 'Batch deleted successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// View students in a batch
exports.viewStudentsInBatch = async (req, res) => {
  try {
    const batch = await TeacherEnrollment.findOne({ _id: req.params.id, teacher: req.user._id }).populate('students');
    if (!batch) return res.status(404).json({ error: 'Batch not found or unauthorized' });
    res.json({ students: batch.students });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};