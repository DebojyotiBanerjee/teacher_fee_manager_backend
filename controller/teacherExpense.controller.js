const TeacherExpense = require('../models/teacherExpense.models');
const CloudinaryService = require('../utils/cloudinaryService');
const { handleError, sendSuccessResponse } = require('../utils/controllerUtils');

// Create a new expense
exports.createExpense = async (req, res) => {
    try {
        const teacherId = req.user._id;
        const { amount, description, category, date, notes } = req.fields || req.body;

        let receiptData = {};
        if (req.files && req.files.receipt) {
            const uploadResult = await CloudinaryService.uploadFile(req.files.receipt, {
                folder: 'expense_receipts'
            });
            receiptData = {
                url: uploadResult.url,
                cloudinaryPublicId: uploadResult.public_id
            };
        }

        const expense = await TeacherExpense.create({
            teacher: teacherId,
            amount,
            description,
            category,
            date: date || new Date(),
            notes,
            receipt: receiptData
        });

        sendSuccessResponse(res, expense, 'Expense created successfully', 201);
    } catch (err) {
        handleError(err, res, 'Failed to create expense');
    }
};

// Get all expenses for a teacher
exports.getExpenses = async (req, res) => {
    try {
        const teacherId = req.user._id;
        const { startDate, endDate, category, status } = req.query;

        const query = { teacher: teacherId };

        // Add date range filter if provided
        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) query.date.$lte = new Date(endDate);
        }

        // Add category filter if provided
        if (category) query.category = category.toUpperCase();

        // Add status filter if provided
        if (status) query.status = status.toUpperCase();

        const expenses = await TeacherExpense.find(query)
            .sort({ date: -1 });

        // Calculate total amount
        const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);

        sendSuccessResponse(res, { expenses, total }, 'Expenses retrieved successfully');
    } catch (err) {
        handleError(err, res, 'Failed to retrieve expenses');
    }
};

// Get expense by ID
exports.getExpenseById = async (req, res) => {
    try {
        const teacherId = req.user._id;
        const { expenseId } = req.params;

        const expense = await TeacherExpense.findOne({
            _id: expenseId,
            teacher: teacherId
        });

        if (!expense) {
            return res.status(404).json({
                success: false,
                message: 'Expense not found'
            });
        }

        sendSuccessResponse(res, expense, 'Expense retrieved successfully');
    } catch (err) {
        handleError(err, res, 'Failed to retrieve expense');
    }
};

// Update expense
exports.updateExpense = async (req, res) => {
    try {
        const teacherId = req.user._id;
        const { expenseId } = req.params;
        const { amount, description, category, date, notes } = req.fields || req.body;

        const expense = await TeacherExpense.findOne({
            _id: expenseId,
            teacher: teacherId
        });

        if (!expense) {
            return res.status(404).json({
                success: false,
                message: 'Expense not found'
            });
        }

        // Only allow updates if status is pending
        if (expense.status !== 'PENDING') {
            return res.status(400).json({
                success: false,
                message: 'Cannot update expense that is not in pending status'
            });
        }

        let receiptData = expense.receipt;
        if (req.files && req.files.receipt) {
            // Delete old receipt if exists
            if (expense.receipt && expense.receipt.cloudinaryPublicId) {
                await CloudinaryService.deleteFile(expense.receipt.cloudinaryPublicId);
            }

            // Upload new receipt
            const uploadResult = await CloudinaryService.uploadFile(req.files.receipt, {
                folder: 'expense_receipts'
            });
            receiptData = {
                url: uploadResult.url,
                cloudinaryPublicId: uploadResult.public_id
            };
        }

        const updatedExpense = await TeacherExpense.findByIdAndUpdate(
            expenseId,
            {
                amount,
                description,
                category,
                date: date || expense.date,
                notes,
                receipt: receiptData
            },
            { new: true }
        );

        sendSuccessResponse(res, updatedExpense, 'Expense updated successfully');
    } catch (err) {
        handleError(err, res, 'Failed to update expense');
    }
};

// Delete expense
exports.deleteExpense = async (req, res) => {
    try {
        const teacherId = req.user._id;
        const { expenseId } = req.params;

        const expense = await TeacherExpense.findOne({
            _id: expenseId,
            teacher: teacherId
        });

        if (!expense) {
            return res.status(404).json({
                success: false,
                message: 'Expense not found'
            });
        }

        // Only allow deletion if status is pending
        if (expense.status !== 'PENDING') {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete expense that is not in pending status'
            });
        }

        // Delete receipt from Cloudinary if exists
        if (expense.receipt && expense.receipt.cloudinaryPublicId) {
            await CloudinaryService.deleteFile(expense.receipt.cloudinaryPublicId);
        }

        await TeacherExpense.findByIdAndDelete(expenseId);

        sendSuccessResponse(res, null, 'Expense deleted successfully');
    } catch (err) {
        handleError(err, res, 'Failed to delete expense');
    }
};

// Get expense summary
exports.getExpenseSummary = async (req, res) => {
    try {
        const teacherId = req.user._id;
        const { startDate, endDate } = req.query;

        const query = { teacher: teacherId };

        // Add date range filter if provided
        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) query.date.$lte = new Date(endDate);
        }

        // Get total by category
        const categoryTotals = await TeacherExpense.aggregate([
            { $match: query },
            {
                $group: {
                    _id: '$category',
                    total: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            }
        ]);

        // Get total by status
        const statusTotals = await TeacherExpense.aggregate([
            { $match: query },
            {
                $group: {
                    _id: '$status',
                    total: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            }
        ]);

        // Get monthly totals
        const monthlyTotals = await TeacherExpense.aggregate([
            { $match: query },
            {
                $group: {
                    _id: {
                        year: { $year: '$date' },
                        month: { $month: '$date' }
                    },
                    total: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': -1, '_id.month': -1 } }
        ]);

        const summary = {
            categoryTotals,
            statusTotals,
            monthlyTotals,
            totalExpenses: categoryTotals.reduce((sum, cat) => sum + cat.total, 0),
            totalCount: categoryTotals.reduce((sum, cat) => sum + cat.count, 0)
        };

        sendSuccessResponse(res, summary, 'Expense summary retrieved successfully');
    } catch (err) {
        handleError(err, res, 'Failed to retrieve expense summary');
    }
};
