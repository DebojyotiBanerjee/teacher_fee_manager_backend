const calculatePercentage = function(next) {
    if (this.academicRecord && this.academicRecord.length > 0) {
      this.academicRecord.forEach(record => {
        if (record.totalMarks && record.obtainedMarks) {
          record.percentage = Math.round((record.obtainedMarks / record.totalMarks) * 100 * 100) / 100;
        }
      });
    }
    next();
};

module.exports = { calculatePercentage };