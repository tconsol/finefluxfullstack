const mongoose = require('mongoose');

const bankDepositSchema = new mongoose.Schema({
  organizationId: { type: String, required: true },
  saleDate: Date,
  saleCashTotal: Number,
  remainingCash: Number,
  depositDate: { type: Date, required: true },
  amount: { type: Number, required: true },
  bankName: String,
  accountNumber: String,
  ifscCode: String,
  referenceNumber: String,
  depositedBy: String,
  receiptUrl: String,
  notes: String
}, { timestamps: true });

require('./jsonPlugin').applyJsonTransform(bankDepositSchema);

module.exports = mongoose.model('BankDeposit', bankDepositSchema, 'bank_deposits');
