const asyncHandler = require('../utils/asyncHandler');
const svc = require('../services/collectionsService');

exports.getAll = asyncHandler(async (req, res) => res.json(await svc.getAll(req.params.orgId)));
exports.getBySaleId = asyncHandler(async (req, res) => res.json(await svc.getBySaleId(req.params.orgId, req.params.saleId)));
exports.getByDateRange = asyncHandler(async (req, res) =>
  res.json(await svc.getByDateRange(req.params.orgId, req.query.from, req.query.to)));
exports.create = asyncHandler(async (req, res) => res.status(201).json(await svc.create(req.params.orgId, req.body)));
exports.update = asyncHandler(async (req, res) => res.json(await svc.update(req.params.orgId, req.params.id, req.body)));
exports.remove = asyncHandler(async (req, res) => {
  await svc.remove(req.params.orgId, req.params.id);
  res.status(204).send();
});
