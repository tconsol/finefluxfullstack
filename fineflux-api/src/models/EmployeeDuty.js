const mongoose = require('mongoose');

const dutySchema = new mongoose.Schema({
  organizationId: String,
  empId: String,
  dutyDate: Date,
  productIds: [String],
  gunIds: [String],
  shiftStart: String,
  shiftEnd: String,
  totalHours: Number,
  status: { type: String, enum: ['SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED'] }
}, { timestamps: true });

require('./jsonPlugin').applyJsonTransform(dutySchema);

module.exports = mongoose.model('EmployeeDuty', dutySchema, 'employee_duties');
