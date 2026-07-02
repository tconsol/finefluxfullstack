const mongoose = require('mongoose');

const financeSummarySchema = new mongoose.Schema({
  organizationId: String,
  cashReceived: { type: Number, default: 0 },
  phonePay: { type: Number, default: 0 },
  creditCard: { type: Number, default: 0 },
  petrolInventory: { type: Number, default: 0 },
  dieselInventory: { type: Number, default: 0 },
  premiumPetrolInventory: { type: Number, default: 0 },
  cngInventory: { type: Number, default: 0 },
  twoTInventory: { type: Number, default: 0 },
  totalExpenses: { type: Number, default: 0 },
  description: String,
  total: { type: Number, default: 0 }
}, { timestamps: true });

require('./jsonPlugin').applyJsonTransform(financeSummarySchema);

module.exports = mongoose.model('FinanceSummary', financeSummarySchema, 'finance_summary');
