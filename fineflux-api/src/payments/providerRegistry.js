const phonepe = require('./providers/phonepe');
const paytm = require('./providers/paytm');

// Adding Razorpay/BharatPe later is: write src/payments/providers/razorpay.js matching
// base.js's contract, then add one line here. Nothing else in the payments module changes.
const registry = {
  phonepe,
  paytm
};

function getProvider(name) {
  const provider = registry[name];
  if (!provider) throw new Error(`Unknown payment provider: ${name}`);
  return provider;
}

function listProviders() {
  return Object.keys(registry);
}

module.exports = { getProvider, listProviders };
