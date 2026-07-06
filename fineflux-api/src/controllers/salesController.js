const asyncHandler = require('../utils/asyncHandler');
const svc = require('../services/salesService');

exports.getAll = asyncHandler(async (req, res) => res.json(await svc.getAllSales(req.params.orgId)));
exports.getById = asyncHandler(async (req, res) => res.json(await svc.getSaleById(req.params.orgId, req.params.id)));
exports.getByDateRange = asyncHandler(async (req, res) =>
  res.json(await svc.getSalesByDateRange(req.params.orgId, req.query.from, req.query.to)));
exports.create = asyncHandler(async (req, res) => res.status(201).json(await svc.createSale(req.params.orgId, req.body)));
exports.update = asyncHandler(async (req, res) => res.json(await svc.updateSale(req.params.orgId, req.params.id, req.body)));
exports.remove = asyncHandler(async (req, res) => {
  await svc.deleteSale(req.params.orgId, req.params.saleId, req.employeeId);
  res.status(204).send();
});
