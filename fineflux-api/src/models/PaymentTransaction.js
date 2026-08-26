const mongoose = require('mongoose');

// Normalized shape every provider adapter must map its own payload into, so reporting
// endpoints and reconciliation never need to know which gateway a row came from.
const paymentTransactionSchema = new mongoose.Schema({
  organizationId: { type: String, required: true },
  provider: { type: String, required: true }, // 'phonepe' | 'paytm' | 'razorpay' | 'bharatpe' | ...

  // Our merchantTransactionId sent when the payment was initiated — the stable idempotency key.
  providerTransactionId: { type: String, required: true },
  // The gateway's own transaction id (PhonePe transactionId / Paytm txnId), once known.
  providerReferenceId: String,

  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  status: {
    type: String,
    enum: ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED', 'CANCELLED'],
    default: 'PENDING'
  },
  paymentMethod: String, // UPI | CARD | WALLET | NETBANKING | OTHER
  payerVpa: String,
  payerName: String,
  payerContact: String,

  utr: String, // bank UTR, once settled
  settlementStatus: { type: String, enum: ['UNSETTLED', 'SETTLED'], default: 'UNSETTLED' },
  settlementDate: Date,

  // How this row entered our system, for debugging when webhook vs. reconciliation disagree.
  source: { type: String, enum: ['webhook', 'reconciliation'], default: 'webhook' },
  reconciledAt: Date,

  // Full provider payload, for audit trail when something looks wrong.
  rawPayload: mongoose.Schema.Types.Mixed
}, { timestamps: true });

paymentTransactionSchema.index(
  { organizationId: 1, provider: 1, providerTransactionId: 1 },
  { unique: true }
);
paymentTransactionSchema.index({ organizationId: 1, createdAt: -1 });
paymentTransactionSchema.index({ organizationId: 1, status: 1, createdAt: -1 });

require('./jsonPlugin').applyJsonTransform(paymentTransactionSchema, ['rawPayload']);

module.exports = mongoose.model('PaymentTransaction', paymentTransactionSchema, 'payment_transactions');
