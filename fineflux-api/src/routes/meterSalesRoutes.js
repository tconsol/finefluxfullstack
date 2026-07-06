const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const svc = require('../services/meterSalesService');

router.get('/org/:orgId/summary', asyncHandler(async (req, res) => {
  res.json(await svc.getMeterSalesSummary(req.params.orgId, req.query.product));
}));

module.exports = router;
