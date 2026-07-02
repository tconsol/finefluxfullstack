const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  organizationId: String,
  productId: String,
  productName: String,
  totalCapacity: mongoose.Types.Decimal128,
  stockValue: mongoose.Types.Decimal128,
  currentLevel: mongoose.Types.Decimal128,
  metric: String,
  status: Boolean,
  tankCapacity: mongoose.Types.Decimal128,
  empId: String
}, { timestamps: { createdAt: 'createdAt', updatedAt: 'lastUpdated' } });

module.exports = mongoose.model('Inventory', inventorySchema, 'inventory');
