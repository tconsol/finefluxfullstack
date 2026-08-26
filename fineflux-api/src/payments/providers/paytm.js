const axios = require('axios');
const PaytmChecksum = require('paytmchecksum');
const env = require('../../config/env');
const { ProviderConfigError } = require('./base');

// Paytm Business (PG). Every request/callback carries a CHECKSUMHASH generated from the
// merchant key via Paytm's own checksum library (AES-based, not a plain HMAC — hence
// using their official `paytmchecksum` package rather than reimplementing it).
// Docs: https://business.paytm.com/docs/api/transaction-status-api/

function requireConfig() {
  const { merchantId, merchantKey } = env.paytm;
  if (!merchantId || !merchantKey) {
    throw new ProviderConfigError('Paytm is not configured (PAYTM_MERCHANT_ID / PAYTM_MERCHANT_KEY missing)');
  }
  return env.paytm;
}

const STATUS_MAP = {
  TXN_SUCCESS: 'SUCCESS',
  TXN_FAILURE: 'FAILED',
  PENDING: 'PENDING',
  OPEN: 'PENDING'
};

function parseRawBody(rawBody) {
  const text = rawBody.toString();
  try {
    return JSON.parse(text);
  } catch {
    // Paytm can also deliver callbacks as form-encoded (application/x-www-form-urlencoded).
    return Object.fromEntries(new URLSearchParams(text));
  }
}

function normalizeFromParams(p) {
  return {
    providerTransactionId: p.ORDERID || p.orderId,
    providerReferenceId: p.TXNID || p.txnId,
    amount: Number(p.TXNAMOUNT || p.txnAmount) || 0,
    currency: p.CURRENCY || 'INR',
    status: STATUS_MAP[p.STATUS || p.resultStatus] || 'PENDING',
    paymentMethod: p.PAYMENTMODE || p.paymentMode || 'OTHER',
    payerName: p.NAME,
    utr: p.BANKTXNID || p.bankTxnId,
    rawPayload: p
  };
}

async function verifyWebhookSignature(headers, rawBody) {
  const { merchantKey } = requireConfig();
  const params = parseRawBody(rawBody);
  const checksum = params.CHECKSUMHASH;
  if (!checksum) return false;

  const paramsWithoutChecksum = { ...params };
  delete paramsWithoutChecksum.CHECKSUMHASH;

  return PaytmChecksum.verifySignature(paramsWithoutChecksum, merchantKey, checksum);
}

function parseWebhookPayload(rawBody) {
  const params = parseRawBody(rawBody);
  return normalizeFromParams(params);
}

async function checkStatus(orderId) {
  const { merchantId, merchantKey, baseUrl } = requireConfig();
  const body = { mid: merchantId, orderId };
  const signature = await PaytmChecksum.generateSignature(JSON.stringify(body), merchantKey);

  const res = await axios.post(`${baseUrl}/v3/order/status`, {
    body,
    head: { signature }
  }, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 15000
  });

  const result = res.data?.body;
  if (!result) throw new Error(`Paytm status check returned no body for ${orderId}`);

  return normalizeFromParams({
    ORDERID: result.orderId,
    TXNID: result.txnId,
    TXNAMOUNT: result.txnAmount,
    STATUS: result.resultInfo?.resultStatus,
    PAYMENTMODE: result.paymentMode,
    BANKTXNID: result.bankTxnId,
    ...result
  });
}

module.exports = { name: 'paytm', verifyWebhookSignature, parseWebhookPayload, checkStatus };
