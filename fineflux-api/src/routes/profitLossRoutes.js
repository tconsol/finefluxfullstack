const express = require('express');
const router = express.Router({ mergeParams: true });
const asyncHandler = require('../utils/asyncHandler');
const svc = require('../services/profitLossService');

router.get('/all', asyncHandler(async (req, res) => res.json(await svc.getAll(req.params.orgId))));
router.post('/calculate', asyncHandler(async (req, res) => res.status(201).json(await svc.calculateAndSaveProfitLoss(req.params.orgId))));

module.exports = router;
