const express = require('express');
const router = express.Router({ mergeParams: true });
const asyncHandler = require('../utils/asyncHandler');
const { SaleHistory } = require('../models');

router.get('/', asyncHandler(async (req, res) => {
  const docs = await SaleHistory.find({ organizationId: req.params.orgId }).sort({ dateTime: 1 });
  res.json(docs);
}));

router.get('/by-date', asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const docs = await SaleHistory.find({
    organizationId: req.params.orgId,
    dateTime: { $gte: new Date(from), $lte: new Date(to) }
  }).sort({ dateTime: 1 });
  res.json(docs);
}));

module.exports = router;
