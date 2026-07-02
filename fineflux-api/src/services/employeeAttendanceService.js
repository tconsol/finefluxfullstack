const { EmployeeAttendance, EmployeeDuty } = require('../models');
const { ApiError } = require('../middleware/errorHandler');
const { shiftMinutes, diffMinutes, round2 } = require('../utils/dateTime');
const { startOfMonthIst, endOfMonthIst } = require('../config/timezone');

async function computeMonthlyMetrics(orgId, empId, referenceDate) {
  const monthStart = startOfMonthIst(referenceDate).toDate();
  const monthEnd = endOfMonthIst(referenceDate).toDate();

  const [attendances, duties] = await Promise.all([
    EmployeeAttendance.find({ organizationId: orgId, empId, createdAt: { $gte: monthStart, $lte: monthEnd } }),
    EmployeeDuty.find({ organizationId: orgId, empId, dutyDate: { $gte: monthStart, $lte: monthEnd } })
  ]);

  const presentDays = attendances.filter((a) => a.present === 'YES').length;
  const scheduledDutyDays = duties.length;
  const totalWorkingMins = attendances.reduce((sum, a) => sum + (a.workingMins || 0), 0);

  const attendanceRate = scheduledDutyDays > 0 ? round2((presentDays / scheduledDutyDays) * 100) : 0;
  const avgHours = presentDays > 0 ? round2((totalWorkingMins / 60) / presentDays) : 0;

  return { attendanceRate, avgHours };
}

async function create(orgId, body) {
  const { empId, username, checkIn, checkOut, breakIn, breakOut, description } = body;

  const present = checkIn && checkOut ? 'YES' : 'NO';
  const absent = present === 'YES' ? 'NO' : 'YES';

  const latestDuty = await EmployeeDuty.findOne({
    organizationId: orgId, empId, shiftStart: { $ne: null }, shiftEnd: { $ne: null }
  }).sort({ dutyDate: -1 });

  const actuallyWorkingHoursMins = latestDuty ? shiftMinutes(latestDuty.shiftStart, latestDuty.shiftEnd) : 0;

  const breakTimeMins = breakIn && breakOut ? diffMinutes(breakIn, breakOut) : 0;
  const rawWorkingMins = checkIn && checkOut ? diffMinutes(checkIn, checkOut) : 0;
  const workingMins = Math.max(0, rawWorkingMins - breakTimeMins);

  let shortTimeMins = 0;
  let extraHoursMins = 0;
  if (workingMins >= actuallyWorkingHoursMins) {
    extraHoursMins = workingMins - actuallyWorkingHoursMins;
  } else {
    shortTimeMins = actuallyWorkingHoursMins - workingMins;
  }

  const attendance = await EmployeeAttendance.create({
    organizationId: orgId, empId, username, present, absent,
    checkIn, checkOut, breakIn, breakOut, breakTimeMins,
    actuallyWorkingHoursMins, workingMins, shortTimeMins, extraHoursMins, description
  });

  const { attendanceRate, avgHours } = await computeMonthlyMetrics(orgId, empId, checkIn || new Date());
  attendance.attendanceRate = attendanceRate;
  attendance.avgHours = avgHours;
  await attendance.save();

  return attendance;
}

async function getAllByOrg(orgId) {
  return EmployeeAttendance.find({ organizationId: orgId }).sort({ createdAt: -1 });
}

async function getById(orgId, id) {
  const doc = await EmployeeAttendance.findOne({ _id: id, organizationId: orgId });
  if (!doc) throw new ApiError(404, 'Attendance record not found');
  return doc;
}

async function getByEmpId(orgId, empId) {
  return EmployeeAttendance.find({ organizationId: orgId, empId }).sort({ createdAt: -1 });
}

async function getByDateRange(orgId, start, end) {
  return EmployeeAttendance.find({
    organizationId: orgId,
    checkIn: { $gte: new Date(start), $lte: new Date(end) }
  }).sort({ checkIn: 1 });
}

async function update(orgId, id, body) {
  const doc = await EmployeeAttendance.findOneAndUpdate(
    { _id: id, organizationId: orgId },
    { $set: body },
    { new: true, runValidators: true }
  );
  if (!doc) throw new ApiError(404, 'Attendance record not found');
  return doc;
}

async function remove(orgId, id) {
  const doc = await EmployeeAttendance.findOneAndDelete({ _id: id, organizationId: orgId });
  if (!doc) throw new ApiError(404, 'Attendance record not found');
}

module.exports = { create, getAllByOrg, getById, getByEmpId, getByDateRange, update, remove };
