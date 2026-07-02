const bcrypt = require('bcryptjs');
const { Employee } = require('../models');
const { ApiError } = require('../middleware/errorHandler');
const { signToken } = require('../middleware/auth');

async function authenticate(username, password) {
  const employee = await Employee.findOne({ username });
  if (!employee) throw new ApiError(401, 'Invalid username or password');
  if (employee.status !== 'ACTIVE') throw new ApiError(403, 'Employee account is inactive');

  const matches = await bcrypt.compare(password, employee.passwordHash);
  if (!matches) throw new ApiError(401, 'Invalid username or password');

  const payload = {
    id: employee._id.toString(),
    username: employee.username,
    role: employee.role,
    organizationId: employee.organizationId,
    empId: employee.empId
  };
  const token = signToken(payload);
  return { ...payload, token };
}

module.exports = { authenticate };
