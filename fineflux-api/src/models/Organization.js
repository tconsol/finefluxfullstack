const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  organizationId: { type: String, required: true, unique: true },
  organizationName: { type: String, required: true },
  gstNumber: { type: String, match: /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/ },
  address1: { type: String, required: true },
  address2: String,
  city: { type: String, required: true },
  state: { type: String, required: true },
  country: { type: String, required: true },
  postalCode: { type: String, required: true },
  phoneNumber: { type: String, match: /^\+?[0-9]{7,15}$/ },
  email: { type: String, lowercase: true },
  licenseNumber: String,
  ownerFirstName: { type: String, required: true },
  ownerLastName: { type: String, required: true }
}, { timestamps: true });

require('./jsonPlugin').applyJsonTransform(organizationSchema);

module.exports = mongoose.model('Organization', organizationSchema, 'organizations');
