const asyncHandler = require('../utils/asyncHandler');
const { ApiError } = require('../middleware/errorHandler');
const svc = require('../services/dailySummaryService');

exports.get = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) throw new ApiError(400, 'from and to are required');
  res.json(await svc.getDailySummary(req.params.orgId, from, to));
});

exports.getDetail = asyncHandler(async (req, res) => {
  res.json(await svc.getDayDetail(req.params.orgId, req.params.date));
});
