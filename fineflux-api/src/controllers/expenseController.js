const asyncHandler = require('../utils/asyncHandler');
const svc = require('../services/expenseService');

exports.getAll = asyncHandler(async (req, res) => res.json(await svc.getAll(req.params.orgId)));
exports.getById = asyncHandler(async (req, res) => res.json(await svc.getById(req.params.orgId, req.params.id)));
exports.searchByEmployeeName = asyncHandler(async (req, res) =>
  res.json(await svc.searchByEmployeeName(req.params.orgId, req.query.employeeName)));
exports.searchByCategory = asyncHandler(async (req, res) =>
  res.json(await svc.searchByCategory(req.params.orgId, req.query.categoryName)));
exports.searchByDateRange = asyncHandler(async (req, res) =>
  res.json(await svc.searchByDateRange(req.params.orgId, req.query.from, req.query.to)));
exports.getAllEmployeeNames = asyncHandler(async (req, res) => res.json(await svc.getAllEmployeeNames(req.params.orgId)));
exports.create = asyncHandler(async (req, res) => res.status(201).json(await svc.create(req.params.orgId, req.body)));
exports.update = asyncHandler(async (req, res) => res.json(await svc.update(req.params.orgId, req.params.id, req.body)));
exports.remove = asyncHandler(async (req, res) => {
  await svc.remove(req.params.orgId, req.params.id);
  res.status(204).send();
});
