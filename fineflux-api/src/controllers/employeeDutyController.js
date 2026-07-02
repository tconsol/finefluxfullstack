const asyncHandler = require('../utils/asyncHandler');
const svc = require('../services/employeeDutyService');

exports.getAll = asyncHandler(async (req, res) => res.json(await svc.getAll(req.params.orgId)));
exports.getById = asyncHandler(async (req, res) => res.json(await svc.getById(req.params.orgId, req.params.id)));
exports.getByEmployee = asyncHandler(async (req, res) => res.json(await svc.getByEmployee(req.params.orgId, req.params.empId)));
exports.getByEmployeeAndDateRange = asyncHandler(async (req, res) =>
  res.json(await svc.getByEmployeeAndDateRange(req.params.orgId, req.params.empId, req.query.startDate, req.query.endDate)));
exports.getByStatus = asyncHandler(async (req, res) => res.json(await svc.getByStatus(req.params.orgId, req.params.status)));
exports.create = asyncHandler(async (req, res) => res.status(201).json(await svc.create(req.params.orgId, req.body)));
exports.update = asyncHandler(async (req, res) => res.json(await svc.update(req.params.orgId, req.params.id, req.body)));
exports.remove = asyncHandler(async (req, res) => {
  await svc.remove(req.params.orgId, req.params.id);
  res.status(204).send();
});
