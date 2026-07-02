const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  organizationId: { type: String, required: true },
  productName: { type: String, required: true },
  price: Number,
  status: { type: Boolean, default: true },
  tankCapacity: mongoose.Types.Decimal128,
  description: String,
  supplier: String,
  currentLevel: { type: mongoose.Types.Decimal128, default: 0 },
  metric: String,
  empId: String
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema, 'products');
