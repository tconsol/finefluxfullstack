const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  organizationId: String,
  empId: String,
  username: String,
  present: { type: String, enum: ['YES', 'NO'] },
  absent: { type: String, enum: ['YES', 'NO'] },
  attendanceRate: Number,
  avgHours: Number,
  checkIn: Date,
  checkOut: Date,
  breakIn: Date,
  breakOut: Date,
  breakTimeMins: Number,
  actuallyWorkingHoursMins: Number,
  workingMins: Number,
  shortTimeMins: Number,
  extraHoursMins: Number,
  description: String
}, { timestamps: true });

require('./jsonPlugin').applyJsonTransform(attendanceSchema);

module.exports = mongoose.model('EmployeeAttendance', attendanceSchema, 'employee_attendance');
