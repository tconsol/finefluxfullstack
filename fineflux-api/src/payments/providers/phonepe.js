const crypto = require('crypto');
const axios = require('axios');
const env = require('../../config/env');
const { ProviderConfigError } = require('./base');

// PhonePe PG Standard Checkout: every request/callback is authenticated with an
// X-VERIFY header = SHA256(<payload-or-path> + saltKey) + "###" + saltIndex.
// Docs: https://developer.phonepe.com/v1/reference/pay-api

function requireConfig() {
  const { merchantId, saltKey } = env.phonepe;
  if (!merchantId || !saltKey) {
    throw new ProviderConfigError('PhonePe is not configured (PHONEPE_MERCHANT_ID / PHONEPE_SALT_KEY missing)');
  }
  return env.phonepe;
}

function sha256Hex(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function buildXVerify(stringToHash, saltIndex) {
  return `${sha256Hex(stringToHash)}###${saltIndex}`;
}

function extractIndex(xVerifyHeader) {
  const parts = String(xVerifyHeader || '').split('###');
  return { hash: parts[0], index: parts[1] };
}

const STATE_MAP = {
  COMPLETED: 'SUCCESS',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  PAYMENT_ERROR: 'FAILED',
  PENDING: 'PENDING',
  PAYMENT_PENDING: 'PENDING',
  CANCELLED: 'CANCELLED'
};

function normalizeFromData(data) {
  const instrument = data.paymentInstrument || {};
  return {
    providerTransactionId: data.merchantTransactionId,
    providerReferenceId: data.transactionId,
    amount: (Number(data.amount) || 0) / 100, // PhonePe amounts are in paise
    currency: 'INR',
    status: STATE_MAP[data.state] || STATE_MAP[data.responseCode] || 'PENDING',
    paymentMethod: instrument.type || 'OTHER',
    payerVpa: instrument.vpa || instrument.accountHolderName,
    utr: instrument.utr,
    rawPayload: data
  };
}

// The webhook POST body is `{ response: "<base64 JSON>" }`. Signature covers the raw
// base64 string, not the decoded JSON — verify against that, before ever decoding it.
function verifyWebhookSignature(headers, rawBody) {
  const { saltKey, saltIndex } = requireConfig();
  const xVerify = headers['x-verify'] || headers['X-VERIFY'];
  if (!xVerify) return false;

  let body;
  try {
    body = JSON.parse(rawBody.toString());
  } catch {
    return false;
  }
  if (!body.response) return false;

  const { hash, index } = extractIndex(xVerify);
  const expectedHash = sha256Hex(body.response + saltKey);
  return hash === expectedHash && index === String(saltIndex);
}

function parseWebhookPayload(rawBody) {
  const body = JSON.parse(rawBody.toString());
  const decoded = JSON.parse(Buffer.from(body.response, 'base64').toString('utf8'));
  const data = decoded.data || decoded;
  return normalizeFromData(data);
}

async function checkStatus(merchantTransactionId) {
  const { merchantId, saltKey, saltIndex, baseUrl } = requireConfig();
  const path = `/pg/v1/status/${merchantId}/${merchantTransactionId}`;
  const xVerify = buildXVerify(path + saltKey, saltIndex);

  const res = await axios.get(`${baseUrl}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      'X-VERIFY': xVerify,
      'X-MERCHANT-ID': merchantId
    },
    timeout: 15000
  });

  const data = res.data?.data;
  if (!data) throw new Error(`PhonePe status check returned no data for ${merchantTransactionId}`);
  return normalizeFromData(data);
}

module.exports = { name: 'phonepe', verifyWebhookSignature, parseWebhookPayload, checkStatus };
