const mongoose = require('mongoose');

const expenseCatSchema = new mongoose.Schema({
  categoryName: String,
  organizationId: String
}, { timestamps: true });

module.exports = mongoose.model('ExpenseCategory', expenseCatSchema, 'expense_category');
