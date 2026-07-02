const { EmployeeTask, Employee } = require('../models');
const { ApiError } = require('../middleware/errorHandler');
const { dayjs, IST } = require('../config/timezone');

async function getAllTasks(orgId) {
  return EmployeeTask.find({ organizationId: orgId }).sort({ createdAt: -1 });
}

async function getEmployeeTasks(orgId, empId, status) {
  const filter = { organizationId: orgId, assignedToEmpId: empId };
  if (status) filter.status = status;
  return EmployeeTask.find(filter).sort({ createdAt: -1 });
}

async function assignTask(orgId, body) {
  const employee = await Employee.findOne({ organizationId: orgId, empId: body.assignedToEmpId });
  if (!employee) throw new ApiError(404, 'Assigned employee not found');
  if (employee.status !== 'ACTIVE') throw new ApiError(400, 'Assigned employee is not active');

  return EmployeeTask.create({
    ...body,
    organizationId: orgId,
    assignedToName: `${employee.firstName} ${employee.lastName}`,
    status: body.status || 'pending',
    dueDate: body.dueDate || dayjs().tz(IST).add(1, 'day').toDate()
  });
}

async function updateTaskStatus(orgId, taskId, status) {
  const task = await EmployeeTask.findOneAndUpdate(
    { _id: taskId, organizationId: orgId },
    { $set: { status } },
    { new: true, runValidators: true }
  );
  if (!task) throw new ApiError(404, 'Task not found');
  return task;
}

module.exports = { getAllTasks, getEmployeeTasks, assignTask, updateTaskStatus };
