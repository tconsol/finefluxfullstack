const mongoose = require('mongoose');

const expenseCatSchema = new mongoose.Schema({
  categoryName: String,
  organizationId: String
}, { timestamps: true });

require('./jsonPlugin').applyJsonTransform(expenseCatSchema);

module.exports = mongoose.model('ExpenseCategory', expenseCatSchema, 'expense_category');
