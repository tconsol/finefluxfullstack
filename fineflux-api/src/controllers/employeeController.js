const asyncHandler = require('../utils/asyncHandler');
const empService = require('../services/employeeService');

exports.list = asyncHandler(async (req, res) => res.json(await empService.list(req.params.orgId, req.query)));
exports.get = asyncHandler(async (req, res) => res.json(await empService.get(req.params.orgId, req.params.id)));
exports.create = asyncHandler(async (req, res) => res.status(201).json(await empService.create(req.params.orgId, req.body)));
exports.update = asyncHandler(async (req, res) => res.json(await empService.update(req.params.orgId, req.params.id, req.body)));
exports.remove = asyncHandler(async (req, res) => {
  await empService.remove(req.params.orgId, req.params.id);
  res.status(204).send();
});
exports.changePassword = asyncHandler(async (req, res) => {
  await empService.changePassword(req.params.orgId, req.params.id, req.body.currentPassword, req.body.newPassword);
  res.status(204).send();
});
