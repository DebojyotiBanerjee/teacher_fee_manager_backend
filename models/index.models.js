const user = require('./user.models.js');
const batchSchema = require('./batch.models.js');
const detailTeacher = require('./detailTeacher.models.js');
const detailStudent = require('./detailStudent.model.js');
const rating = require('./rating.models.js');
const attendance = require('./attendance.models.js');
const payment = require('./payment.models');
const fee = require('./fee.models');

module.exports = {
  user,
  batchSchema,
  detailTeacher,
  detailStudent,
  rating,
  attendance,
  payment,
  fee
};