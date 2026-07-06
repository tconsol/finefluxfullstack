const express = require('express');
const router = express.Router({ mergeParams: true });
const asyncHandler = require('../utils/asyncHandler');
const svc = require('../services/financeSummaryService');

router.get('/', asyncHandler(async (req, res) => res.json(await svc.getAllByOrg(req.params.orgId))));
router.get('/latest', asyncHandler(async (req, res) => res.json(await svc.getLatestByOrg(req.params.orgId))));
router.post('/auto', asyncHandler(async (req, res) => res.status(201).json(await svc.autoCreateFinanceSummary(req.params.orgId))));
router.put('/:id', asyncHandler(async (req, res) => res.json(await svc.update(req.params.orgId, req.params.id, req.body))));

module.exports = router;
