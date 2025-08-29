const ChartService = require('../utils/chartService');
const Fee = require('../models/fee.models');
const Payment = require('../models/payment.models');
const OfflinePayment = require('../models/offlinePayment.models');
const TeacherExpense = require('../models/teacherExpense.models');
const { handleError, sendSuccessResponse } = require('../utils/controllerUtils');

exports.getTeacherStats = async (req, res) => {
    try {
        const teacherId = req.user._id;
        const { startDate, endDate } = req.query;

        // Set default date range to current year if not provided
        const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
        const end = endDate ? new Date(endDate) : new Date();

        // Fetch all income data (online and offline)
        const [onlinePayments, offlinePayments] = await Promise.all([
            Payment.find({
                teacher: teacherId,
                paidAt: { $gte: start, $lte: end }
            }),
            OfflinePayment.find({
                teacher: teacherId,
                paidAt: { $gte: start, $lte: end }
            })
        ]);

        // Prepare income data for chart
        const incomeData = [
            ...onlinePayments.map(payment => ({
                amount: payment.amount,
                date: payment.paidAt,
                type: 'online'
            })),
            ...offlinePayments.map(payment => ({
                amount: payment.amount,
                date: payment.paidAt,
                type: 'offline'
            }))
        ];

        // Fetch expense data
        const expenses = await TeacherExpense.find({
            teacher: teacherId,
            date: { $gte: start, $lte: end }
        });

        // Generate charts
        const [incomeChartData, expenseChartData] = await Promise.all([
            ChartService.generateIncomeCharts(incomeData),
            ChartService.generateExpenseCharts(expenses)
        ]);

        // Calculate summary
        const summary = {
            totalIncome: incomeChartData.totalOnline + incomeChartData.totalOffline,
            onlineIncome: incomeChartData.totalOnline,
            offlineIncome: incomeChartData.totalOffline,
            totalExpenses: expenseChartData.totalExpenses,
            netIncome: (incomeChartData.totalOnline + incomeChartData.totalOffline) - expenseChartData.totalExpenses,
            expensesByCategory: expenseChartData.categoryTotals,
            charts: {
                onlineIncome: incomeChartData.onlineChart,
                offlineIncome: incomeChartData.offlineChart,
                incomeDistribution: incomeChartData.distributionChart,
                expenseTrend: expenseChartData.trendChart,
                expenseCategories: expenseChartData.categoryChart
            },
            monthlyData: {
                online: incomeChartData.monthlyOnline,
                offline: incomeChartData.monthlyOffline,
                expenses: expenseChartData.monthlyExpenses
            },
            dateRange: {
                start,
                end
            }
        };

        sendSuccessResponse(res, summary, 'Teacher statistics retrieved successfully');
    } catch (err) {
        handleError(err, res, 'Failed to retrieve teacher statistics');
    }
};
