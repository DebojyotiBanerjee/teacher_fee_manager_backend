const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const cloudinary = require('./cloudinaryUtils');

// Configure chart canvas with different sizes for different chart types
const wideChartCanvas = new ChartJSNodeCanvas({
    width: 1000,
    height: 400,
    backgroundColour: 'white',
    plugins: {
        modern: ['chartjs-plugin-annotation']
    }
});

const squareChartCanvas = new ChartJSNodeCanvas({
    width: 500,
    height: 500,
    backgroundColour: 'white',
    plugins: {
        modern: ['chartjs-plugin-annotation']
    }
});

class ChartService {
    static async generateIncomeCharts(incomeData) {
        try {
            const months = [
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
            ];

            // Prepare datasets
            const onlineIncome = Array(12).fill(0);
            const offlineIncome = Array(12).fill(0);

            // Process income data
            incomeData.forEach(income => {
                const month = new Date(income.date).getMonth();
                if (income.type === 'online') {
                    onlineIncome[month] += income.amount;
                } else {
                    offlineIncome[month] += income.amount;
                }
            });

            // Online Income Chart Configuration
            const onlineConfiguration = {
                type: 'line',
                data: {
                    labels: months,
                    datasets: [
                        {
                            label: 'Online Income',
                            data: onlineIncome,
                            backgroundColor: 'rgba(54, 162, 235, 0.2)',
                            borderColor: 'rgb(54, 162, 235)',
                            borderWidth: 2,
                            fill: true,
                            tension: 0.4
                        }
                    ]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Amount (₹)'
                            }
                        }
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: 'Monthly Online Income Trend'
                        }
                    }
                }
            };

            // Offline Income Chart Configuration
            const offlineConfiguration = {
                type: 'line',
                data: {
                    labels: months,
                    datasets: [
                        {
                            label: 'Offline Income',
                            data: offlineIncome,
                            backgroundColor: 'rgba(75, 192, 192, 0.2)',
                            borderColor: 'rgb(75, 192, 192)',
                            borderWidth: 2,
                            fill: true,
                            tension: 0.4
                        }
                    ]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Amount (₹)'
                            }
                        }
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: 'Monthly Offline Income Trend'
                        }
                    }
                }
            };

            // Combined Income Pie Chart Configuration
            const totalOnline = onlineIncome.reduce((a, b) => a + b, 0);
            const totalOffline = offlineIncome.reduce((a, b) => a + b, 0);
            
            const pieConfiguration = {
                type: 'pie',
                data: {
                    labels: ['Online Income', 'Offline Income'],
                    datasets: [{
                        data: [totalOnline, totalOffline],
                        backgroundColor: [
                            'rgba(54, 162, 235, 0.5)',
                            'rgba(75, 192, 192, 0.5)'
                        ],
                        borderColor: [
                            'rgb(54, 162, 235)',
                            'rgb(75, 192, 192)'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Income Distribution'
                        },
                        legend: {
                            position: 'right'
                        }
                    }
                }
            };

            // Generate all charts
            const [onlineImage, offlineImage, pieImage] = await Promise.all([
                wideChartCanvas.renderToBuffer(onlineConfiguration),
                wideChartCanvas.renderToBuffer(offlineConfiguration),
                squareChartCanvas.renderToBuffer(pieConfiguration)
            ]);

            // Upload all charts to Cloudinary
            const [onlineResult, offlineResult, pieResult] = await Promise.all([
                cloudinary.uploader.upload(`data:image/png;base64,${onlineImage.toString('base64')}`, {
                    folder: 'charts',
                    public_id: `online-income-chart-${Date.now()}`
                }),
                cloudinary.uploader.upload(`data:image/png;base64,${offlineImage.toString('base64')}`, {
                    folder: 'charts',
                    public_id: `offline-income-chart-${Date.now()}`
                }),
                cloudinary.uploader.upload(`data:image/png;base64,${pieImage.toString('base64')}`, {
                    folder: 'charts',
                    public_id: `income-distribution-${Date.now()}`
                })
            ]);

            return {
                onlineChart: onlineResult.secure_url,
                offlineChart: offlineResult.secure_url,
                distributionChart: pieResult.secure_url,
                totalOnline,
                totalOffline,
                monthlyOnline: onlineIncome,
                monthlyOffline: offlineIncome
            };
        } catch (error) {
            throw new Error(`Error generating income chart: ${error.message}`);
        }
    }

    static async generateExpenseCharts(expenseData) {
        try {
            const categories = ['UTILITIES', 'EQUIPMENT', 'MATERIALS', 'SOFTWARE', 'OTHER'];
            const monthlyExpenses = Array(12).fill(0);
            const categoryTotals = {};

            // Initialize category totals
            categories.forEach(cat => categoryTotals[cat] = 0);

            // Process expense data
            expenseData.forEach(expense => {
                const month = new Date(expense.date).getMonth();
                monthlyExpenses[month] += expense.amount;
                categoryTotals[expense.category] += expense.amount;
            });

            // Create monthly trend chart
            const trendConfiguration = {
                type: 'line',
                data: {
                    labels: [
                        'January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'
                    ],
                    datasets: [{
                        label: 'Monthly Expenses',
                        data: monthlyExpenses,
                        fill: false,
                        borderColor: 'rgb(255, 99, 132)',
                        tension: 0.1
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Amount (₹)'
                            }
                        }
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: 'Monthly Expense Trend'
                        }
                    }
                }
            };

            // Create category distribution chart
            const categoryConfiguration = {
                type: 'pie',
                data: {
                    labels: categories,
                    datasets: [{
                        data: categories.map(cat => categoryTotals[cat]),
                        backgroundColor: [
                            'rgba(255, 99, 132, 0.5)',
                            'rgba(54, 162, 235, 0.5)',
                            'rgba(255, 206, 86, 0.5)',
                            'rgba(75, 192, 192, 0.5)',
                            'rgba(153, 102, 255, 0.5)'
                        ],
                        borderColor: [
                            'rgb(255, 99, 132)',
                            'rgb(54, 162, 235)',
                            'rgb(255, 206, 86)',
                            'rgb(75, 192, 192)',
                            'rgb(153, 102, 255)'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Expense Distribution by Category'
                        },
                        legend: {
                            position: 'right'
                        }
                    }
                }
            };

            // Generate both charts
            const trendImage = await wideChartCanvas.renderToBuffer(trendConfiguration);
            const categoryImage = await squareChartCanvas.renderToBuffer(categoryConfiguration);

            // Upload both charts to Cloudinary
            const [trendResult, categoryResult] = await Promise.all([
                cloudinary.uploader.upload(`data:image/png;base64,${trendImage.toString('base64')}`, {
                    folder: 'charts',
                    public_id: `expense-trend-${Date.now()}`
                }),
                cloudinary.uploader.upload(`data:image/png;base64,${categoryImage.toString('base64')}`, {
                    folder: 'charts',
                    public_id: `expense-category-${Date.now()}`
                })
            ]);

            return {
                trendChart: trendResult.secure_url,
                categoryChart: categoryResult.secure_url,
                totalExpenses: monthlyExpenses.reduce((a, b) => a + b, 0),
                categoryTotals
            };
        } catch (error) {
            throw new Error(`Error generating expense charts: ${error.message}`);
        }
    }
}

module.exports = ChartService;
