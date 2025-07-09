const DetailStudent = require('../models/detailStudent.model');
const Batch = require('../models/batch.models');
const mongoose = require('mongoose');


// View Batches : Student filtered available batches

exports.getAvailableBatches = async (req, res) => {
    try {
        const filters = {};

        // filter by subject,status(online/offline),teacher
        if (req.query.subject) filters.subject = req.query.subject;
        if (req.query.status) filters.status = req.query.status;
        if (req.query.teacher) filters.teacher = req.query.teacher;

        // Filter by start date range (optional)
        if (req.query.startDate || req.query.endDate) {
            filters['schedule.startDate'] = {};
            if (req.query.startDate) filters['schedule.startDate'].$gte = new Date(req.query.startDate);
            if (req.query.endDate) filters['schedule.startDate'].$lte = new Date(req.query.endDate);
        }
        // Fetch matching batches and populate teacher info
        const batches = await Batch.find(filters).populate('teacher', 'user subjectsTaught');
        res.json(batches);


    } catch (error) {
        console.log(`error in getAvailableBatches ${error.message}`)
        res.status(500).json({ error: error.message });

    }
}