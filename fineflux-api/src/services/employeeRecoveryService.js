const { v4: uuidv4 } = require('uuid');
const { Employee, EmployeePasswordResetToken } = require('../models');
const { ApiError } = require('../middleware/errorHandler');
const { sendMail } = require('../config/mailer');
const env = require('../config/env');
const { hashPassword } = require('../utils/password');

const ONE_HOUR_MS = 60 * 60 * 1000;

async function requestPasswordReset(orgId, usernameOrEmail) {
  const employee = await Employee.findOne({
    organizationId: orgId,
    $or: [{ username: usernameOrEmail }, { emailId: usernameOrEmail?.toLowerCase() }]
  });
  // Always return success regardless of whether the employee was found.
  if (!employee) return;

  const token = uuidv4();
  await EmployeePasswordResetToken.create({
    orgId,
    token,
    employeeId: employee.empId,
    expiryDate: new Date(Date.now() + ONE_HOUR_MS)
  });

  const resetLink = `${env.frontendUrl}/reset-password?token=${token}&orgId=${orgId}`;
  await sendMail({
    to: employee.emailId,
    subject: 'FineFlux Password Reset',
    html: `<p>Click the link below to reset your password. This link expires in 1 hour.</p><p><a href="${resetLink}">${resetLink}</a></p>`
  });
}

async function resetPassword(orgId, token, newPassword) {
  const resetToken = await EmployeePasswordResetToken.findOne({ token, orgId });
  if (!resetToken) throw new ApiError(400, 'Invalid or expired reset token');
  if (resetToken.expiryDate < new Date()) {
    await EmployeePasswordResetToken.deleteOne({ _id: resetToken._id });
    throw new ApiError(400, 'Invalid or expired reset token');
  }
  if (!newPassword || newPassword.length < 6) throw new ApiError(400, 'New password must be at least 6 characters');

  const employee = await Employee.findOne({ organizationId: orgId, empId: resetToken.employeeId });
  if (!employee) throw new ApiError(404, 'Employee not found');

  employee.passwordHash = await hashPassword(newPassword);
  await employee.save();
  await EmployeePasswordResetToken.deleteOne({ _id: resetToken._id });
}

async function sendUsernameByEmail(orgId, email) {
  const employee = await Employee.findOne({ organizationId: orgId, emailId: email?.toLowerCase() });
  if (!employee) return; // always return success

  await sendMail({
    to: employee.emailId,
    subject: 'FineFlux Username Recovery',
    html: `<p>Your username is: <strong>${employee.username}</strong></p>`
  });
}

module.exports = { requestPasswordReset, resetPassword, sendUsernameByEmail };
