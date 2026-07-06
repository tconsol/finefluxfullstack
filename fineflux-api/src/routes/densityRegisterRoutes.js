const express = require('express');
const router = express.Router({ mergeParams: true });
const asyncHandler = require('../utils/asyncHandler');
const { DensityRegister } = require('../models');
const { ApiError } = require('../middleware/errorHandler');
const { round2 } = require('../utils/dateTime');

function withComputed(body) {
  const patch = { ...body };
  if (patch.hydramMeter !== undefined && patch.tempaturInCelsius !== undefined) {
    patch.convertedToCelsius = round2(patch.hydramMeter + patch.tempaturInCelsius * 0.415);
  }
  if (patch.compositeReading !== undefined && patch.asPerChallan !== undefined) {
    patch.difference = round2(patch.compositeReading - patch.asPerChallan);
  }
  return patch;
}

router.get('/', asyncHandler(async (req, res) => {
  res.json(await DensityRegister.find({ organizationId: req.params.orgId }).sort({ dateTime: -1 }));
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const doc = await DensityRegister.findOne({ _id: req.params.id, organizationId: req.params.orgId });
  if (!doc) throw new ApiError(404, 'Density register entry not found');
  res.json(doc);
}));

router.post('/', asyncHandler(async (req, res) => {
  const doc = await DensityRegister.create({ ...withComputed(req.body), organizationId: req.params.orgId });
  res.status(201).json(doc);
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const doc = await DensityRegister.findOneAndUpdate(
    { _id: req.params.id, organizationId: req.params.orgId },
    { $set: withComputed(req.body) },
    { new: true, runValidators: true }
  );
  if (!doc) throw new ApiError(404, 'Density register entry not found');
  res.json(doc);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const doc = await DensityRegister.findOneAndDelete({ _id: req.params.id, organizationId: req.params.orgId });
  if (!doc) throw new ApiError(404, 'Density register entry not found');
  res.status(204).send();
}));

module.exports = router;
