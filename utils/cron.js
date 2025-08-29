const cron = require('node-cron');
const notificationController = require('../controller/notification.controller');

// Every day at 9:00 AM, notify students 7 days before due
dailyNotifyUpcomingFeeDue = cron.schedule('0 9 * * *', async () => {
  try {
    await notificationController.notifyUpcomingFeeDue();
    console.log('Ran notifyUpcomingFeeDue');
  } catch (err) {
    console.error('Error in notifyUpcomingFeeDue cron:', err);
  }
});

// Every day at 9:05 AM, email students whose fee is due today
dailyEmailFeeDueToday = cron.schedule('5 9 * * *', async () => {
  try {
    await notificationController.emailFeeDueToday();
    console.log('Ran emailFeeDueToday');
  } catch (err) {
    console.error('Error in emailFeeDueToday cron:', err);
  }
});

module.exports = {
  dailyNotifyUpcomingFeeDue,
  dailyEmailFeeDueToday
};
