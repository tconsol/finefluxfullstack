const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  description: String,
  amount: { type: Number, required: true },
  categoryName: { type: String, required: true },
  expenseDate: Date,
  organizationId: String,
  empId: String,
  employeeName: String
}, { timestamps: true });

require('./jsonPlugin').applyJsonTransform(expenseSchema);

module.exports = mongoose.model('Expense', expenseSchema, 'expense');
