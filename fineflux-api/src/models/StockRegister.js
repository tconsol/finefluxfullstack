const mongoose = require('mongoose');

const stockRegisterSchema = new mongoose.Schema({
  dateTime: Date,
  productName: String,
  organizationId: String,
  dipReadingProduct: Number,
  dipReadingWater: Number,
  netStockLiters: Number,
  totalOpeningStock: Number,
  receiptQuantityInLitres: Number,
  closingStockInLitres: Number,
  saleAsForTankStock: Number,
  actualSalesAsPerMeter: Number,
  stockVariation: Number
}, { timestamps: true });

require('./jsonPlugin').applyJsonTransform(stockRegisterSchema);

module.exports = mongoose.model('StockRegister', stockRegisterSchema, 'stockregister');
