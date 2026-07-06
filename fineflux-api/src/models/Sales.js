const mongoose = require('mongoose');

const salesSchema = new mongoose.Schema({
  saleId: { type: String, required: true },
  organizationId: { type: String, required: true },
  dateTime: { type: Date, required: true },
  saleEndTime: Date,
  productName: String,
  guns: String,
  empId: String,
  openingStock: { type: Number, default: 0 },
  closingStock: { type: Number, default: 0 },
  testingTotal: { type: Number, default: 0 },
  salesInLiters: { type: Number, default: 0 },
  price: { type: Number, default: 0 },
  salesInRupees: { type: Number, default: 0 },
  saleMatchKey: String,
  inventoryId: String
}, { timestamps: true });

require('./jsonPlugin').applyJsonTransform(salesSchema);

module.exports = mongoose.model('Sales', salesSchema, 'sales');
