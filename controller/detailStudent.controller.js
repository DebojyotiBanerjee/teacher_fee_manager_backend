const DetailStudent = require('../models/detailStudent.model');

// Create a new detailStudent
exports.createDetailStudent = async (req, res) => {
  try {
    const detailStudent = new DetailStudent({
      user: req.user.id,
      education: req.body.education,
      subjects: req.body.subjects,
      enrolledBatches: []
    });
    await detailStudent.save();
    res.status(201).json(detailStudent);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get detailStudent by ID
exports.getDetailStudentById = async (req, res) => {
  try {
    const detailStudent = await DetailStudent.findById(req.params.id)
      .populate('user', 'fullname email phone')
      .populate('enrolledBatches.batch');
    if (!detailStudent) return res.status(404).json({ error: 'Not found' });
    res.json(detailStudent);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Update detailStudent
exports.updateDetailStudent = async (req, res) => {
  try {
    const detailStudent = await DetailStudent.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!detailStudent) return res.status(404).json({ error: 'Not found' });
    res.json(detailStudent);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete detailStudent
exports.deleteDetailStudent = async (req, res) => {
  try {
    const detailStudent = await DetailStudent.findByIdAndDelete(req.params.id);
    if (!detailStudent) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Student Dashboard
exports.getStudentDashboard = async (req, res) => {
  try {
    const student = await DetailStudent.findOne({ user: req.user.id })
      .populate('enrolledBatches.batch');
    if (!student) return res.status(404).json({ error: 'Student profile not found' });
    res.json({
      profile: student,
      enrolledBatches: student.enrolledBatches
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};