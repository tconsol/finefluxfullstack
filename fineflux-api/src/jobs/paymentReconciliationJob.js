const cron = require('node-cron');
const env = require('../config/env');
const { getProvider } = require('../payments/providerRegistry');
const { ProviderConfigError } = require('../payments/providers/base');
const paymentTransactionService = require('../services/paymentTransactionService');

// Catches whatever the webhook missed: a PENDING row past the grace period gets its
// current status re-fetched straight from the gateway and upserted, same as a webhook
// delivery would. Runs per-org since providerTransactionId is only unique within an org.
async function reconcileOnce() {
  const orgIds = await paymentTransactionService.listAllOrgIdsWithTransactions();

  for (const orgId of orgIds) {
    const stale = await paymentTransactionService.listStalePending(orgId);
    for (const txn of stale) {
      let provider;
      try {
        provider = getProvider(txn.provider);
      } catch {
        continue; // unknown/removed provider — nothing we can do
      }

      try {
        const normalized = await provider.checkStatus(txn.providerTransactionId);
        await paymentTransactionService.upsertTransaction(orgId, txn.provider, normalized, 'reconciliation');
      } catch (err) {
        if (err instanceof ProviderConfigError) {
          console.warn(`[reconciliation] ${txn.provider} not configured, skipping org ${orgId}`);
          break; // no point retrying other rows for this org/provider this sweep
        }
        console.error(`[reconciliation] ${txn.provider} status check failed for ${txn.providerTransactionId}:`, err.message);
      }
    }
  }
}

function startReconciliationJob() {
  const minutes = env.reconciliationIntervalMinutes;
  const schedule = `*/${minutes} * * * *`;
  cron.schedule(schedule, () => {
    reconcileOnce().catch((err) => console.error('[reconciliation] sweep failed:', err));
  });
  console.log(`[reconciliation] scheduled every ${minutes} minute(s)`);
}

module.exports = { startReconciliationJob, reconcileOnce };
