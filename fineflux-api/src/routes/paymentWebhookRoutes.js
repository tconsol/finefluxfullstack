const express = require('express');
const router = express.Router();

const { getProvider } = require('../payments/providerRegistry');
const paymentTransactionService = require('../services/paymentTransactionService');
const { ProviderConfigError } = require('../payments/providers/base');

// Public — gateways call this directly, so auth is the provider signature itself, not a
// bearer token. Mounted with express.raw() so req.body is the exact byte buffer the
// signature was computed over; this router MUST be mounted before the global
// express.json() parser in app.js or the buffer will already be consumed/parsed.
router.post('/:orgId/:provider', express.raw({ type: '*/*', limit: '2mb' }), async (req, res) => {
  const { orgId, provider: providerName } = req.params;
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');

  let provider;
  try {
    provider = getProvider(providerName);
  } catch {
    return res.status(404).json({ message: `Unknown payment provider: ${providerName}` });
  }

  try {
    const isValid = await provider.verifyWebhookSignature(req.headers, rawBody);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid webhook signature' });
    }

    const normalized = provider.parseWebhookPayload(rawBody);
    await paymentTransactionService.upsertTransaction(orgId, providerName, normalized, 'webhook');

    // Ack fast — gateways retry on non-2xx / slow responses, and we've already persisted.
    return res.status(200).json({ status: 'ok' });
  } catch (err) {
    if (err instanceof ProviderConfigError) {
      return res.status(503).json({ message: err.message });
    }
    console.error(`[payments] ${providerName} webhook error:`, err);
    return res.status(400).json({ message: 'Webhook processing failed' });
  }
});

module.exports = router;
