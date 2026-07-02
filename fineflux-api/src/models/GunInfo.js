const mongoose = require('mongoose');

const gunInfoSchema = new mongoose.Schema({
  empId: String,
  organizationId: String,
  productName: String,
  guns: String,
  serialNumber: String,
  currentReading: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('GunInfo', gunInfoSchema, 'guninfo');
