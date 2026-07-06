const { EmployeeDuty } = require('../models');
const { ApiError } = require('../middleware/errorHandler');
const { shiftHoursRounded } = require('../utils/dateTime');

async function getAll(orgId) {
  return EmployeeDuty.find({ organizationId: orgId }).sort({ dutyDate: -1 });
}

async function getById(orgId, id) {
  const doc = await EmployeeDuty.findOne({ _id: id, organizationId: orgId });
  if (!doc) throw new ApiError(404, 'Duty not found');
  return doc;
}

async function getByEmployee(orgId, empId) {
  return EmployeeDuty.find({ organizationId: orgId, empId }).sort({ dutyDate: -1 });
}

async function getByEmployeeAndDateRange(orgId, empId, startDate, endDate) {
  return EmployeeDuty.find({
    organizationId: orgId, empId,
    dutyDate: { $gte: new Date(startDate), $lte: new Date(endDate) }
  }).sort({ dutyDate: 1 });
}

async function getByStatus(orgId, status) {
  return EmployeeDuty.find({ organizationId: orgId, status });
}

async function create(orgId, body) {
  const existing = await EmployeeDuty.findOne({
    organizationId: orgId, empId: body.empId, dutyDate: body.dutyDate
  });
  if (existing) throw new ApiError(409, 'Duty already scheduled for this employee on this date');

  const totalHours = body.shiftStart && body.shiftEnd ? shiftHoursRounded(body.shiftStart, body.shiftEnd) : undefined;

  return EmployeeDuty.create({
    ...body,
    organizationId: orgId,
    status: body.status || 'SCHEDULED',
    totalHours
  });
}

async function update(orgId, id, body) {
  const patch = { ...body };
  if (patch.shiftStart && patch.shiftEnd) {
    patch.totalHours = shiftHoursRounded(patch.shiftStart, patch.shiftEnd);
  }
  const doc = await EmployeeDuty.findOneAndUpdate(
    { _id: id, organizationId: orgId },
    { $set: patch },
    { new: true, runValidators: true }
  );
  if (!doc) throw new ApiError(404, 'Duty not found');
  return doc;
}

async function remove(orgId, id) {
  const doc = await EmployeeDuty.findOneAndDelete({ _id: id, organizationId: orgId });
  if (!doc) throw new ApiError(404, 'Duty not found');
}

module.exports = { getAll, getById, getByEmployee, getByEmployeeAndDateRange, getByStatus, create, update, remove };
