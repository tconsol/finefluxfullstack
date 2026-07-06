const asyncHandler = require('../utils/asyncHandler');
const svc = require('../services/inventoryService');

exports.list = asyncHandler(async (req, res) => res.json(await svc.getAllInventories(req.params.orgId)));
exports.getLatestInventory = asyncHandler(async (req, res) =>
  res.json(await svc.getLatestInventory(req.params.orgId, req.params.productId)));
exports.create = asyncHandler(async (req, res) => res.status(201).json(await svc.createInventory(req.params.orgId, req.body)));
exports.update = asyncHandler(async (req, res) =>
  res.json(await svc.updateInventory(req.params.orgId, req.params.productId, req.params.empId, req.body)));
exports.remove = asyncHandler(async (req, res) => {
  await svc.deleteInventory(req.params.orgId, req.params.inventoryId, req.employeeId);
  res.status(204).send();
});
