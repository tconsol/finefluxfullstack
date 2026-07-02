const mongoose = require('mongoose');

const densityRegisterSchema = new mongoose.Schema({
  dateTime: Date,
  hydramMeter: Number,
  tempaturInCelsius: Number,
  convertedToCelsius: Number,
  receiptQuantityInLitres: { type: Map, of: Number },
  ttRegnNo: String,
  compositeReading: Number,
  asPerChallan: Number,
  difference: Number,
  densityAt15AfterDecantation: { type: Map, of: Number },
  productName: String,
  organizationId: String
}, { timestamps: true });

module.exports = mongoose.model('DensityRegister', densityRegisterSchema, 'densityregister');
