const Academic = require('../models/academic.models');

// Create new academic record
exports.createAcademic = async (req, res) => {
  try {
    const academic = new Academic(req.body);
    await academic.save();
    res.status(201).json(academic);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get all academic records
exports.getAllAcademics = async (req, res) => {
  try {
    const academics = await Academic.find().populate('student');
    res.json(academics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get academic record by ID
exports.getAcademicById = async (req, res) => {
  try {
    const academic = await Academic.findById(req.params.id).populate('student');
    if (!academic) return res.status(404).json({ error: 'Academic record not found' });
    res.json(academic);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update academic record
exports.updateAcademic = async (req, res) => {
  try {
    const academic = await Academic.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!academic) return res.status(404).json({ error: 'Academic record not found' });
    res.json(academic);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete academic record
exports.deleteAcademic = async (req, res) => {
  try {
    const academic = await Academic.findByIdAndDelete(req.params.id);
    if (!academic) return res.status(404).json({ error: 'Academic record not found' });
    res.json({ message: 'Academic record deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};