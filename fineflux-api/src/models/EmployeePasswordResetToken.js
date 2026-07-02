const mongoose = require('mongoose');

const resetTokenSchema = new mongoose.Schema({
  orgId: String,
  token: { type: String, required: true },
  employeeId: String,
  expiryDate: { type: Date, required: true }
});

module.exports = mongoose.model('EmployeePasswordResetToken', resetTokenSchema, 'employee_password_reset_tokens');
