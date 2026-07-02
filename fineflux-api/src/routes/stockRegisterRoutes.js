const express = require('express');
const router = express.Router({ mergeParams: true });
const asyncHandler = require('../utils/asyncHandler');
const { StockRegister } = require('../models');
const { ApiError } = require('../middleware/errorHandler');
const { round2 } = require('../utils/dateTime');

function withVariation(body) {
  const patch = { ...body };
  if (patch.actualSalesAsPerMeter !== undefined && patch.saleAsForTankStock !== undefined) {
    patch.stockVariation = round2(patch.actualSalesAsPerMeter - patch.saleAsForTankStock);
  }
  return patch;
}

router.get('/', asyncHandler(async (req, res) => {
  res.json(await StockRegister.find({ organizationId: req.params.orgId }).sort({ dateTime: -1 }));
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const doc = await StockRegister.findOne({ _id: req.params.id, organizationId: req.params.orgId });
  if (!doc) throw new ApiError(404, 'Stock register entry not found');
  res.json(doc);
}));

router.post('/', asyncHandler(async (req, res) => {
  const doc = await StockRegister.create({ ...withVariation(req.body), organizationId: req.params.orgId });
  res.status(201).json(doc);
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const doc = await StockRegister.findOneAndUpdate(
    { _id: req.params.id, organizationId: req.params.orgId },
    { $set: withVariation(req.body) },
    { new: true, runValidators: true }
  );
  if (!doc) throw new ApiError(404, 'Stock register entry not found');
  res.json(doc);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const doc = await StockRegister.findOneAndDelete({ _id: req.params.id, organizationId: req.params.orgId });
  if (!doc) throw new ApiError(404, 'Stock register entry not found');
  res.status(204).send();
}));

module.exports = router;
