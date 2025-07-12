const user = require('./user.models.js');
const batchSchema = require('./batch.models.js');
const detailTeacher = require('./detailTeacher.models.js');
const detailStudent = require('./detailStudent.model.js');
const rating = require('./rating.models.js');
const attendance = require('./attendance.models.js');

module.exports = {
  user,
  batchSchema,
  detailTeacher,
  detailStudent,
  rating,
  attendance
};