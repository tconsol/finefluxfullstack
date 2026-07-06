const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  organizationId: { type: String, required: true },
  custId: { type: String, required: true },
  customerName: { type: String, required: true },
  customerVehicleNum: { type: String, required: true },
  empId: { type: String, required: true },
  amountBorrowed: { type: mongoose.Types.Decimal128, default: 0 },
  totalBorrowedAmount: { type: mongoose.Types.Decimal128, default: 0 },
  borrowDate: Date,
  dueDate: Date,
  status: { type: String, enum: ['PENDING', 'PARTIAL', 'PAID', 'OVERDUE'] },
  lifecycleStatus: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  phoneNumber: { type: String, match: /^\+?[0-9]{7,15}$/ },
  email: { type: String, lowercase: true },
  notes: String,
  address: {
    line1: String, line2: String, city: String, state: String, postalCode: String, country: String
  }
}, { timestamps: true });

customerSchema.index({ organizationId: 1, custId: 1 }, { unique: true });

require('./jsonPlugin').applyJsonTransform(customerSchema);

module.exports = mongoose.model('Customer', customerSchema, 'customers');
