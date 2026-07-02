const mongoose = require('mongoose');

const invLogSchema = new mongoose.Schema({
  inventoryId: String,
  organizationId: String,
  productId: String,
  productName: String,
  totalCapacity: mongoose.Types.Decimal128,
  stockValue: mongoose.Types.Decimal128,
  currentLevel: mongoose.Types.Decimal128,
  metric: String,
  status: Boolean,
  tankCapacity: mongoose.Types.Decimal128,
  receiptQuantityInLitres: { type: Number, default: 0 },
  mutationby: String,
  empId: String
}, { timestamps: { createdAt: 'createdAt', updatedAt: 'lastUpdated' } });

module.exports = mongoose.model('InventoryLog', invLogSchema, 'inventory_logs');
