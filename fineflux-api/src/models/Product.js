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
  empId: String,
  // Packet-based products (2T oil): tankCapacity/currentLevel/price still hold the
  // packet count and cost-per-packet, this just records the ml size per packet for display.
  mlPerPacket: Number
}, { timestamps: true });

require('./jsonPlugin').applyJsonTransform(productSchema);

module.exports = mongoose.model('Product', productSchema, 'products');
