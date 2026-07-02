const mongoose = require('mongoose');

const collectionsSchema = new mongoose.Schema({
  saleId: String,
  saleMatchKey: String,
  organizationId: { type: String, required: true },
  dateTime: { type: Date, required: true },
  empId: String,
  cashReceived: { type: Number, default: 0 },
  phonePay: { type: Number, default: 0 },
  creditCard: { type: Number, default: 0 },
  shortCollections: { type: Number, default: 0 },
  productName: String,
  guns: String,
  expectedTotal: { type: Number, default: 0 },
  receivedTotal: { type: Number, default: 0 },
  accessCollections: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Collections', collectionsSchema, 'collections');
