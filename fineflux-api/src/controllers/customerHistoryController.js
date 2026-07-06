const asyncHandler = require('../utils/asyncHandler');
const svc = require('../services/customerHistoryService');

exports.listByCustId = asyncHandler(async (req, res) => res.json(await svc.listByCustomer(req.params.orgId, req.params.custId, req.query)));
exports.latest = asyncHandler(async (req, res) => res.json(await svc.latestN(req.params.orgId, req.query.custId, req.query.limit)));
exports.listAll = asyncHandler(async (req, res) => res.json(await svc.listByOrg(req.params.orgId, req.query)));
exports.todayOrg = asyncHandler(async (req, res) => res.json(await svc.listByOrgToday(req.params.orgId, req.query)));
exports.weekOrg = asyncHandler(async (req, res) => res.json(await svc.listByOrgLastWeek(req.params.orgId, req.query)));
exports.monthOrg = asyncHandler(async (req, res) => res.json(await svc.listByOrgMonth(req.params.orgId, req.query)));
exports.rangeOrg = asyncHandler(async (req, res) =>
  res.json(await svc.listByOrgDateRange(req.params.orgId, req.query.from, req.query.to, req.query)));
exports.add = asyncHandler(async (req, res) => res.status(201).json(await svc.addTransaction(req.params.orgId, req.body)));
