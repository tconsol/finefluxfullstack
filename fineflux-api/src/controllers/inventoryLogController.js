const asyncHandler = require('../utils/asyncHandler');
const { InventoryLog } = require('../models');
const { ApiError } = require('../middleware/errorHandler');

exports.getAllLogs = asyncHandler(async (req, res) => {
  const logs = await InventoryLog.find({ organizationId: req.params.orgId }).sort({ lastUpdated: -1 });
  res.json(logs);
});

exports.getLogById = asyncHandler(async (req, res) => {
  const log = await InventoryLog.findOne({ _id: req.params.id, organizationId: req.params.orgId });
  if (!log) throw new ApiError(404, 'Inventory log not found');
  res.json(log);
});

exports.getLogsByProductName = asyncHandler(async (req, res) => {
  const { productName } = req.query;
  const logs = await InventoryLog.find({
    organizationId: req.params.orgId,
    productName: { $regex: productName || '', $options: 'i' }
  }).sort({ lastUpdated: -1 });
  res.json(logs);
});

exports.deleteLog = asyncHandler(async (req, res) => {
  const log = await InventoryLog.findOneAndDelete({ _id: req.params.id, organizationId: req.params.orgId });
  if (!log) throw new ApiError(404, 'Inventory log not found');
  res.status(204).send();
});
