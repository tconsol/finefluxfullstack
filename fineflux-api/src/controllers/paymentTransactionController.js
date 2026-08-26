const asyncHandler = require('../utils/asyncHandler');
const svc = require('../services/paymentTransactionService');
const { listProviders } = require('../payments/providerRegistry');

exports.today = asyncHandler(async (req, res) => res.json(await svc.listToday(req.params.orgId)));

exports.history = asyncHandler(async (req, res) => {
  const { from, to, provider, status, page, size } = req.query;
  res.json(await svc.listHistory(req.params.orgId, { from, to, provider, status, page, size }));
});

exports.settlements = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  res.json(await svc.listSettlements(req.params.orgId, { from, to }));
});

exports.providers = asyncHandler(async (req, res) => res.json(listProviders()));
