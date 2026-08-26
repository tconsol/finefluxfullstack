const { PaymentTransaction } = require('../models');
const { dayjs, IST } = require('../config/timezone');

/**
 * Idempotent upsert keyed by (organizationId, provider, providerTransactionId) — safe to
 * call repeatedly from both the webhook handler and the reconciliation sweep without
 * creating duplicate rows, and later calls only move status forward in the natural
 * PENDING -> SUCCESS/FAILED progression (a stale PENDING re-delivery never clobbers a
 * transaction we've already confirmed).
 */
async function upsertTransaction(organizationId, provider, normalized, source) {
  const existing = await PaymentTransaction.findOne({
    organizationId,
    provider,
    providerTransactionId: normalized.providerTransactionId
  });

  if (existing && existing.status !== 'PENDING' && normalized.status === 'PENDING') {
    return existing;
  }

  const update = {
    organizationId,
    provider,
    providerTransactionId: normalized.providerTransactionId,
    providerReferenceId: normalized.providerReferenceId,
    amount: normalized.amount,
    currency: normalized.currency || 'INR',
    status: normalized.status,
    paymentMethod: normalized.paymentMethod,
    payerVpa: normalized.payerVpa,
    payerName: normalized.payerName,
    payerContact: normalized.payerContact,
    utr: normalized.utr,
    rawPayload: normalized.rawPayload,
    source,
    reconciledAt: source === 'reconciliation' ? new Date() : existing?.reconciledAt
  };

  return PaymentTransaction.findOneAndUpdate(
    { organizationId, provider, providerTransactionId: normalized.providerTransactionId },
    { $set: update },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function listToday(orgId) {
  const dayStart = dayjs().tz(IST).startOf('day');
  const dayEnd = dayjs().tz(IST).endOf('day');
  return PaymentTransaction.find({
    organizationId: orgId,
    createdAt: { $gte: dayStart.toDate(), $lte: dayEnd.toDate() }
  }).sort({ createdAt: -1 });
}

async function listHistory(orgId, { from, to, provider, status, page = 0, size = 50 }) {
  const filter = { organizationId: orgId };
  if (from && to) filter.createdAt = { $gte: new Date(from), $lte: new Date(to) };
  if (provider) filter.provider = provider;
  if (status) filter.status = status;

  const skip = Math.max(0, Number(page)) * Math.max(1, Number(size));
  const limit = Math.max(1, Number(size));

  const [content, totalElements] = await Promise.all([
    PaymentTransaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    PaymentTransaction.countDocuments(filter)
  ]);

  return { content, totalElements, totalPages: Math.ceil(totalElements / limit), page: Number(page), size: limit };
}

async function listSettlements(orgId, { from, to } = {}) {
  const filter = { organizationId: orgId, status: 'SUCCESS', settlementStatus: 'SETTLED' };
  if (from && to) filter.settlementDate = { $gte: new Date(from), $lte: new Date(to) };
  return PaymentTransaction.find(filter).sort({ settlementDate: -1 });
}

// Transactions still PENDING after a grace period — these are exactly what the
// reconciliation sweep needs to re-check, since a webhook may never have arrived at all.
async function listStalePending(orgId, olderThanMinutes = 10) {
  const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000);
  return PaymentTransaction.find({
    organizationId: orgId,
    status: 'PENDING',
    createdAt: { $lte: cutoff }
  });
}

async function listAllOrgIdsWithTransactions() {
  return PaymentTransaction.distinct('organizationId');
}

module.exports = {
  upsertTransaction,
  listToday,
  listHistory,
  listSettlements,
  listStalePending,
  listAllOrgIdsWithTransactions
};
