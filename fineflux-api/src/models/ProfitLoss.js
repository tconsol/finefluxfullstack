const mongoose = require('mongoose');

const profitLossSchema = new mongoose.Schema({
  organizationId: String,
  cashReceived: { type: Number, default: 0 },
  inventoryValue: { type: Number, default: 0 },
  totalExpenses: { type: Number, default: 0 },
  profitLoss: { type: Number, default: 0 },
  calculatedAt: Date
}, { timestamps: true });

require('./jsonPlugin').applyJsonTransform(profitLossSchema);

module.exports = mongoose.model('ProfitLoss', profitLossSchema, 'profit_loss');
