const ChartService = require('../utils/chartService');
const Fee = require('../models/fee.models');
const Payment = require('../models/payment.models');
const OfflinePayment = require('../models/offlinePayment.models');
const TeacherExpense = require('../models/teacherExpense.models');
const { handleError, sendSuccessResponse } = require('../utils/controllerUtils');

exports.getTeacherStats = async (req, res) => {
    try {
        const teacherId = req.user._id;
        const { sortBy = 'date', sortOrder = 'desc', filterType, category } = req.query;

        // Calculate date ranges for 5 months (3 past + current + 1 future)
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();

        // Create array of 5 months (3 past, current, 1 future)
        const months = [];
        for (let i = -3; i <= 1; i++) {
            const monthDate = new Date(currentYear, currentMonth + i, 1);
            const endDate = new Date(currentYear, currentMonth + i + 1, 0); // Last day of month
            months.push({
                month: monthDate.getMonth(),
                year: monthDate.getFullYear(),
                startDate: monthDate,
                endDate: endDate,
                label: monthDate.toLocaleString('default', { month: 'long', year: 'numeric' }),
                isPast: i < 0,
                isCurrent: i === 0,
                isFuture: i > 0
            });
        }

        // Fetch income data for all 5 months
        const incomePromises = months.map(async (monthInfo) => {
            const [onlinePayments, offlinePayments] = await Promise.all([
                Payment.find({
                    teacher: teacherId,
                    status: 'paid',
                    paidAt: { $gte: monthInfo.startDate, $lte: monthInfo.endDate }
                }).populate('student', 'name email').populate('course', 'title fee'),
                
                OfflinePayment.find({
                    teacher: teacherId,
                    paidAt: { $gte: monthInfo.startDate, $lte: monthInfo.endDate }
                }).populate('student', 'name email').populate('course', 'title fee')
            ]);

            const onlineTotal = onlinePayments.reduce((sum, payment) => sum + (payment.course?.fee || 0), 0);
            const offlineTotal = offlinePayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);

            return {
                ...monthInfo,
                income: {
                    online: {
                        total: onlineTotal,
                        payments: onlinePayments.map(p => ({
                            id: p._id,
                            amount: p.course?.fee || 0,
                            date: p.paidAt,
                            student: p.student,
                            course: p.course,
                            type: 'online'
                        }))
                    },
                    offline: {
                        total: offlineTotal,
                        payments: offlinePayments.map(p => ({
                            id: p._id,
                            amount: p.amount || 0,
                            date: p.paidAt,
                            student: p.student,
                            course: p.course,
                            type: 'offline'
                        }))
                    },
                    total: onlineTotal + offlineTotal
                }
            };
        });

        // Fetch expense data for all 5 months
        const expensePromises = months.map(async (monthInfo) => {
            let expenseQuery = {
                teacher: teacherId,
                date: { $gte: monthInfo.startDate, $lte: monthInfo.endDate },
                status: 'APPROVED' 
            };

            // Apply category filter if provided
            if (category) {
                expenseQuery.category = category.toUpperCase();
            }

            const expenses = await TeacherExpense.find(expenseQuery);
            const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);

            // Group expenses by category
            const byCategory = expenses.reduce((acc, expense) => {
                if (!acc[expense.category]) {
                    acc[expense.category] = { total: 0, expenses: [] };
                }
                acc[expense.category].total += expense.amount;
                acc[expense.category].expenses.push({
                    id: expense._id,
                    amount: expense.amount,
                    description: expense.description,
                    date: expense.date,
                    status: expense.status,
                    notes: expense.notes
                });
                return acc;
            }, {});

            return {
                ...monthInfo,
                expenses: {
                    total,
                    byCategory,
                    allExpenses: expenses.map(e => ({
                        id: e._id,
                        amount: e.amount,
                        description: e.description,
                        category: e.category,
                        date: e.date,
                        status: e.status,
                        notes: e.notes
                    }))
                }
            };
        });

        // Wait for all data to be fetched
        const [incomeData, expenseData] = await Promise.all([
            Promise.all(incomePromises),
            Promise.all(expensePromises)
        ]);

        // Combine income and expense data with proper month formatting
        const monthlyStats = months.map((monthInfo, index) => {
            const incomeInfo = incomeData[index].income;
            const expenseInfo = expenseData[index].expenses;
            
            return {
                monthName: monthInfo.label,
                month: monthInfo.month + 1, // 1-based month number
                year: monthInfo.year,
                isPast: monthInfo.isPast,
                isCurrent: monthInfo.isCurrent,
                isFuture: monthInfo.isFuture,
                dateRange: {
                    startDate: monthInfo.startDate,
                    endDate: monthInfo.endDate
                },
                income: {
                    total: incomeInfo.total || 0,
                    online: {
                        total: incomeInfo.online.total || 0,
                        count: incomeInfo.online.payments.length,
                        payments: incomeInfo.online.payments
                    },
                    offline: {
                        total: incomeInfo.offline.total || 0,
                        count: incomeInfo.offline.payments.length,
                        payments: incomeInfo.offline.payments
                    }
                },
                expenses: {
                    total: expenseInfo.total || 0,
                    count: expenseInfo.allExpenses.length,
                    byCategory: expenseInfo.byCategory,
                    allExpenses: expenseInfo.allExpenses
                },
                netIncome: (incomeInfo.total || 0) - (expenseInfo.total || 0),
                summary: {
                    monthName: monthInfo.label,
                    totalIncome: incomeInfo.total || 0,
                    onlineIncome: incomeInfo.online.total || 0,
                    offlineIncome: incomeInfo.offline.total || 0,
                    totalExpenses: expenseInfo.total || 0,
                    netIncome: (incomeInfo.total || 0) - (expenseInfo.total || 0)
                }
            };
        });

        // Apply sorting
        let sortedStats = [...monthlyStats];
        if (sortBy === 'income') {
            sortedStats.sort((a, b) => sortOrder === 'asc' ? 
                a.income.total - b.income.total : 
                b.income.total - a.income.total
            );
        } else if (sortBy === 'expense') {
            sortedStats.sort((a, b) => sortOrder === 'asc' ? 
                a.expenses.total - b.expenses.total : 
                b.expenses.total - a.expenses.total
            );
        } else if (sortBy === 'netIncome') {
            sortedStats.sort((a, b) => sortOrder === 'asc' ? 
                a.netIncome - b.netIncome : 
                b.netIncome - a.netIncome
            );
        }
        // Default sort by date (chronological order)

        // Calculate overall summary
        const overallSummary = {
            totalIncome: monthlyStats.reduce((sum, month) => sum + month.income.total, 0),
            totalOnlineIncome: monthlyStats.reduce((sum, month) => sum + month.income.online.total, 0),
            totalOfflineIncome: monthlyStats.reduce((sum, month) => sum + month.income.offline.total, 0),
            totalExpenses: monthlyStats.reduce((sum, month) => sum + month.expenses.total, 0),
            netIncome: monthlyStats.reduce((sum, month) => sum + month.netIncome, 0),
            pastMonthsData: monthlyStats.filter(m => m.isPast),
            currentMonthData: monthlyStats.find(m => m.isCurrent),
            futureMonthData: monthlyStats.find(m => m.isFuture)
        };

        // Prepare response
        const response = {
            summary: overallSummary,
            monthlyBreakdown: sortedStats,
            filters: {
                sortBy,
                sortOrder,
                filterType,
                category
            },
            availableCategories: ['UTILITIES', 'EQUIPMENT', 'MATERIALS', 'SOFTWARE', 'OTHER'],
            dateRange: {
                from: months[0].startDate,
                to: months[months.length - 1].endDate
            }
        };

        sendSuccessResponse(res, response, 'Teacher statistics retrieved successfully');
    } catch (err) {
        handleError(err, res, 'Failed to retrieve teacher statistics');
    }
};
