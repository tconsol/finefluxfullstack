const mongoose = require('mongoose');

const salaryPaymentSchema = new mongoose.Schema({
  organizationId: { type: String, required: true },
  empId: { type: String, required: true },
  employeeName: String,
  amount: { type: Number, required: true },
  paymentDate: { type: Date, required: true },
  notes: String
}, { timestamps: true });

require('./jsonPlugin').applyJsonTransform(salaryPaymentSchema);

module.exports = mongoose.model('SalaryPayment', salaryPaymentSchema, 'salary_payments');
