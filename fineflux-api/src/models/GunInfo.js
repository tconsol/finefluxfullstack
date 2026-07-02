const mongoose = require('mongoose');

const gunInfoSchema = new mongoose.Schema({
  empId: String,
  organizationId: String,
  productName: String,
  guns: String,
  serialNumber: String,
  currentReading: { type: Number, default: 0 }
}, { timestamps: true });

require('./jsonPlugin').applyJsonTransform(gunInfoSchema);

module.exports = mongoose.model('GunInfo', gunInfoSchema, 'guninfo');
