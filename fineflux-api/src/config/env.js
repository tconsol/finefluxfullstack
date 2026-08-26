const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

// The whole business (petrol station operations) runs in IST. Every timestamp the
// frontend sends without an explicit UTC offset (e.g. "2026-07-02T09:00:00") is a naive
// IST wall-clock string. Node's `new Date(...)` and Mongoose's Date casting both resolve
// naive strings using the PROCESS's OS timezone — fine on a dev machine already set to
// IST, but silently wrong (shifted by up to 5:30h) on any host that defaults to UTC
// (Docker/Cloud Run/etc). Pinning TZ here, before any Date is ever constructed, makes
// naive-string parsing consistently resolve to IST everywhere, matching what the
// frontend assumes and what the original Spring backend did (SPRING_JACKSON_TIMEZONE).
process.env.TZ = 'Asia/Kolkata';

function required(name, fallback) {
  const val = process.env[name] ?? fallback;
  if (val === undefined) throw new Error(`Missing required env var: ${name}`);
  return val;
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '8080', 10),

  mongodbUri: required('MONGODB_URI'),

  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  corsOrigins: (process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),

  gcsBucket: process.env.GCS_BUCKET,
  gcsProjectId: process.env.GCS_PROJECT_ID,
  gcsClientEmail: process.env.GCS_CLIENT_EMAIL,
  // Service account keys store the private key with literal \n escapes since env files
  // can't hold real newlines; unescape them back into a real PEM before use.
  gcsPrivateKey: process.env.GCS_PRIVATE_KEY ? process.env.GCS_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,

  smtpHost: process.env.SMTP_HOST,
  smtpPort: parseInt(process.env.SMTP_PORT || '465', 10),
  smtpSecure: process.env.SMTP_SECURE === 'true',
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  smtpFrom: process.env.SMTP_FROM,

  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  // PhonePe Business (PG Standard Checkout). Leave unset in dev — the adapter throws a
  // clear config error on first use rather than silently failing signature checks.
  phonepe: {
    merchantId: process.env.PHONEPE_MERCHANT_ID,
    saltKey: process.env.PHONEPE_SALT_KEY,
    saltIndex: process.env.PHONEPE_SALT_INDEX || '1',
    baseUrl: process.env.PHONEPE_BASE_URL ||
      (process.env.PHONEPE_ENV === 'production'
        ? 'https://api.phonepe.com/apis/hermes'
        : 'https://api-preprod.phonepe.com/apis/pg-sandbox')
  },

  // Paytm Business (PG). Same story — unset in dev is fine, real merchant credentials
  // (obtained from your Paytm integration rep) get dropped straight into .env.
  paytm: {
    merchantId: process.env.PAYTM_MERCHANT_ID,
    merchantKey: process.env.PAYTM_MERCHANT_KEY,
    website: process.env.PAYTM_WEBSITE || (process.env.PAYTM_ENV === 'production' ? 'DEFAULT' : 'WEBSTAGING'),
    baseUrl: process.env.PAYTM_BASE_URL ||
      (process.env.PAYTM_ENV === 'production'
        ? 'https://securegw.paytm.in'
        : 'https://securegw-stage.paytm.in')
  },

  // How often the reconciliation sweep runs (minutes). 15 by default per spec.
  reconciliationIntervalMinutes: parseInt(process.env.RECONCILIATION_INTERVAL_MINUTES || '15', 10)
};
