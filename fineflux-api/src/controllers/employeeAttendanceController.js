const asyncHandler = require('../utils/asyncHandler');
const svc = require('../services/employeeAttendanceService');

exports.getAllByOrg = asyncHandler(async (req, res) => res.json(await svc.getAllByOrg(req.params.orgId)));
exports.getById = asyncHandler(async (req, res) => res.json(await svc.getById(req.params.orgId, req.params.id)));
exports.getByEmpId = asyncHandler(async (req, res) => res.json(await svc.getByEmpId(req.params.orgId, req.params.empId)));
exports.getByDateRange = asyncHandler(async (req, res) =>
  res.json(await svc.getByDateRange(req.params.orgId, req.query.start, req.query.end)));
exports.create = asyncHandler(async (req, res) => res.status(201).json(await svc.create(req.params.orgId, req.body)));
exports.update = asyncHandler(async (req, res) => res.json(await svc.update(req.params.orgId, req.params.id, req.body)));
exports.remove = asyncHandler(async (req, res) => {
  await svc.remove(req.params.orgId, req.params.id);
  res.status(204).send();
});
