/**
 * Every provider adapter (PhonePe, Paytm, and later Razorpay/BharatPe) must implement
 * this shape. Nothing else in the codebase — webhook routes, the reconciliation job,
 * reporting endpoints — should ever branch on `provider === 'phonepe'`; they only ever
 * call these methods and consume the normalized transaction shape.
 *
 * Normalized transaction shape (what every adapter method returns):
 *   {
 *     providerTransactionId: string,   // our merchantTransactionId (idempotency key)
 *     providerReferenceId?: string,    // gateway's own transaction id
 *     amount: number,                  // rupees, not paise
 *     currency: string,
 *     status: 'PENDING'|'SUCCESS'|'FAILED'|'REFUNDED'|'CANCELLED',
 *     paymentMethod?: string,          // UPI | CARD | WALLET | NETBANKING | OTHER
 *     payerVpa?: string,
 *     payerName?: string,
 *     payerContact?: string,
 *     utr?: string,
 *     rawPayload: object
 *   }
 *
 * @typedef {Object} PaymentProviderAdapter
 * @property {string} name
 * @property {(headers: Record<string,string>, rawBody: Buffer|string) => boolean} verifyWebhookSignature
 * @property {(rawBody: Buffer|string) => object} parseWebhookPayload - returns the normalized shape above
 * @property {(merchantTransactionId: string) => Promise<object>} checkStatus - returns the normalized shape above
 */

class ProviderConfigError extends Error {}

module.exports = { ProviderConfigError };
