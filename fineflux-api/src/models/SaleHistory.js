const mongoose = require('mongoose');

const saleHistorySchema = new mongoose.Schema({
  organizationId: String,
  saleId: String,
  dateTime: Date,
  productName: String,
  guns: String,
  empId: String,
  openingStock: Number,
  closingStock: Number,
  testingTotal: Number,
  salesInLiters: Number,
  price: Number,
  salesInRupees: Number,
  cashReceived: Number,
  phonePay: Number,
  creditCard: Number,
  shortCollections: Number,
  receivedTotal: Number,
  mutationby: String,
  lastUpdated: Date
});

saleHistorySchema.index({ organizationId: 1, saleId: 1, mutationby: 1 }, { unique: true });
saleHistorySchema.index({ organizationId: 1, saleId: 1 });

require('./jsonPlugin').applyJsonTransform(saleHistorySchema);

module.exports = mongoose.model('SaleHistory', saleHistorySchema, 'sale_history');
