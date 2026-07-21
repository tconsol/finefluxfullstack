const asyncHandler = require('../utils/asyncHandler');
const svc = require('../services/salaryPaymentService');

exports.list = asyncHandler(async (req, res) => res.json(await svc.list(req.params.orgId)));
exports.getByDateRange = asyncHandler(async (req, res) =>
  res.json(await svc.getByDateRange(req.params.orgId, req.query.from, req.query.to)));
exports.create = asyncHandler(async (req, res) => res.status(201).json(await svc.create(req.params.orgId, req.body)));
exports.remove = asyncHandler(async (req, res) => {
  await svc.remove(req.params.orgId, req.params.id);
  res.status(204).send();
});
