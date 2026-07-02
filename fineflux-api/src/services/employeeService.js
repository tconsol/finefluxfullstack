const bcrypt = require('bcryptjs');
const { Employee } = require('../models');
const { parsePageable, paginate } = require('../utils/pagination');
const { ApiError } = require('../middleware/errorHandler');

async function list(orgId, query) {
  return paginate(Employee, { organizationId: orgId }, parsePageable(query));
}

async function get(orgId, id) {
  const emp = await Employee.findOne({ _id: id, organizationId: orgId });
  if (!emp) throw new ApiError(404, 'Employee not found');
  return emp;
}

async function create(orgId, body) {
  if (await Employee.exists({ empId: body.empId })) throw new ApiError(409, 'empId already exists');
  if (await Employee.exists({ emailId: body.emailId })) throw new ApiError(409, 'emailId already exists');
  if (await Employee.exists({ organizationId: orgId, username: body.username })) {
    throw new ApiError(409, 'username already exists in this organization');
  }
  const passwordHash = await bcrypt.hash(body.password, 10);
  const { password, ...rest } = body;
  return Employee.create({ ...rest, organizationId: orgId, passwordHash, status: body.status || 'ACTIVE' });
}

async function update(orgId, id, body) {
  const { password, passwordHash, ...rest } = body;
  const emp = await Employee.findOneAndUpdate(
    { _id: id, organizationId: orgId },
    { $set: rest },
    { new: true, runValidators: true }
  );
  if (!emp) throw new ApiError(404, 'Employee not found');
  return emp;
}

async function remove(orgId, id) {
  const emp = await Employee.findOneAndDelete({ _id: id, organizationId: orgId });
  if (!emp) throw new ApiError(404, 'Employee not found');
}

async function changePassword(orgId, id, currentPassword, newPassword) {
  const emp = await Employee.findOne({ _id: id, organizationId: orgId });
  if (!emp) throw new ApiError(404, 'Employee not found');
  const matches = await bcrypt.compare(currentPassword, emp.passwordHash);
  if (!matches) throw new ApiError(400, 'Current password is incorrect');
  if (!newPassword || newPassword.length < 6) throw new ApiError(400, 'New password must be at least 6 characters');
  emp.passwordHash = await bcrypt.hash(newPassword, 10);
  await emp.save();
}

module.exports = { list, get, create, update, remove, changePassword };
