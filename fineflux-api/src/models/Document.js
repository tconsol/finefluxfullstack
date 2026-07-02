const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  organizationId: { type: String, required: true },
  documentType: { type: String, required: true },
  issuingAuthority: { type: String, required: true },
  issuedDate: Date,
  expiryDate: Date,
  renewalPeriodDays: Number,
  responsibleParty: { type: String, required: true },
  fileUrl: { type: String, required: true },
  notes: String
}, { timestamps: true });

module.exports = mongoose.model('Document', documentSchema, 'documents');
