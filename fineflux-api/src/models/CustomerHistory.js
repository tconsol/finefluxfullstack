const mongoose = require('mongoose');

const customerHistorySchema = new mongoose.Schema({
  organizationId: String,
  customerId: String,
  custId: String,
  transactionAmount: mongoose.Types.Decimal128,
  cumulativeAmount: mongoose.Types.Decimal128,
  transactionDate: Date,
  notes: String
}, { timestamps: true });

require('./jsonPlugin').applyJsonTransform(customerHistorySchema);

module.exports = mongoose.model('CustomerHistory', customerHistorySchema, 'customerHistories');
