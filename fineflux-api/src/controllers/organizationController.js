const asyncHandler = require('../utils/asyncHandler');
const orgService = require('../services/organizationService');

exports.list = asyncHandler(async (req, res) => res.json(await orgService.list(req.query)));
exports.get = asyncHandler(async (req, res) => res.json(await orgService.get(req.params.id)));
exports.getByOrgId = asyncHandler(async (req, res) => res.json(await orgService.getByOrgId(req.params.orgId)));
exports.create = asyncHandler(async (req, res) => res.status(201).json(await orgService.create(req.body)));
exports.update = asyncHandler(async (req, res) => res.json(await orgService.update(req.params.id, req.body)));
exports.remove = asyncHandler(async (req, res) => {
  await orgService.remove(req.params.id);
  res.status(204).send();
});
