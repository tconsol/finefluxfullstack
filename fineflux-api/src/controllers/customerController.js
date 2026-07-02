const asyncHandler = require('../utils/asyncHandler');
const svc = require('../services/customerService');

exports.list = asyncHandler(async (req, res) => res.json(await svc.list(req.params.orgId, req.query)));
exports.get = asyncHandler(async (req, res) => res.json(await svc.get(req.params.orgId, req.params.id)));
exports.getToday = asyncHandler(async (req, res) => res.json(await svc.getTodayCustomers(req.params.orgId)));
exports.getWeek = asyncHandler(async (req, res) => res.json(await svc.getWeekCustomers(req.params.orgId)));
exports.getMonth = asyncHandler(async (req, res) => res.json(await svc.getMonthCustomers(req.params.orgId)));
exports.getRange = asyncHandler(async (req, res) =>
  res.json(await svc.getCustomersByDateRange(req.params.orgId, req.query.from, req.query.to)));
exports.create = asyncHandler(async (req, res) => res.status(201).json(await svc.create(req.params.orgId, req.body)));
exports.update = asyncHandler(async (req, res) => res.json(await svc.update(req.params.orgId, req.params.id, req.body)));
exports.updateLifecycleStatus = asyncHandler(async (req, res) =>
  res.json(await svc.updateLifecycleStatus(req.params.orgId, req.params.id, req.body.lifecycleStatus)));
exports.remove = asyncHandler(async (req, res) => {
  await svc.remove(req.params.orgId, req.params.id);
  res.status(204).send();
});
exports.deleteByCustId = asyncHandler(async (req, res) => {
  const custId = req.params.custId || req.query.custId;
  await svc.deleteByCustId(req.params.orgId, custId);
  res.status(204).send();
});
exports.deleteAllForOrg = asyncHandler(async (req, res) => {
  if (req.query.custId) {
    await svc.deleteByCustId(req.params.orgId, req.query.custId);
  } else {
    await svc.deleteAllForOrganization(req.params.orgId);
  }
  res.status(204).send();
});
