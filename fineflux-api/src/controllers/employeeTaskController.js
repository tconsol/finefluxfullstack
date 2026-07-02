const asyncHandler = require('../utils/asyncHandler');
const svc = require('../services/employeeTaskService');

exports.getAllTasks = asyncHandler(async (req, res) => res.json(await svc.getAllTasks(req.params.orgId)));
exports.getEmployeeTasks = asyncHandler(async (req, res) =>
  res.json(await svc.getEmployeeTasks(req.params.orgId, req.params.empId, req.query.status)));
exports.assignTask = asyncHandler(async (req, res) => res.status(201).json(await svc.assignTask(req.params.orgId, req.body)));
exports.updateTaskStatus = asyncHandler(async (req, res) =>
  res.json(await svc.updateTaskStatus(req.params.orgId, req.params.taskId, req.query.status)));
