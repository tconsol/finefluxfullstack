const { Expense, ExpenseCategory, Employee } = require('../models');
const { ApiError } = require('../middleware/errorHandler');
const financeSummaryService = require('./financeSummaryService');

async function getAll(orgId) {
  return Expense.find({ organizationId: orgId }).sort({ expenseDate: -1 });
}

async function getById(orgId, id) {
  const expense = await Expense.findOne({ _id: id, organizationId: orgId });
  if (!expense) throw new ApiError(404, 'Expense not found');
  return expense;
}

async function searchByEmployeeName(orgId, employeeName) {
  return Expense.find({
    organizationId: orgId,
    employeeName: { $regex: employeeName || '', $options: 'i' }
  }).sort({ expenseDate: -1 });
}

async function searchByCategory(orgId, categoryName) {
  return Expense.find({ organizationId: orgId, categoryName }).sort({ expenseDate: -1 });
}

async function searchByDateRange(orgId, from, to) {
  return Expense.find({
    organizationId: orgId,
    expenseDate: { $gte: new Date(from), $lte: new Date(to) }
  }).sort({ expenseDate: -1 });
}

async function getAllEmployeeNames(orgId) {
  const employees = await Employee.find({ organizationId: orgId });
  return employees.map((e) => `${e.firstName} ${e.lastName}`);
}

async function create(orgId, body) {
  const categoryExists = await ExpenseCategory.exists({ organizationId: orgId, categoryName: body.categoryName });
  if (!categoryExists) throw new ApiError(400, 'Expense category does not exist for this organization');

  const expense = await Expense.create({ ...body, organizationId: orgId });
  await financeSummaryService.autoCreateFinanceSummary(orgId);
  return expense;
}

async function update(orgId, id, body) {
  const expense = await Expense.findOneAndUpdate(
    { _id: id, organizationId: orgId },
    { $set: body },
    { new: true, runValidators: true }
  );
  if (!expense) throw new ApiError(404, 'Expense not found');
  return expense;
}

async function remove(orgId, id) {
  const expense = await Expense.findOneAndDelete({ _id: id, organizationId: orgId });
  if (!expense) throw new ApiError(404, 'Expense not found');
}

module.exports = { getAll, getById, searchByEmployeeName, searchByCategory, searchByDateRange, getAllEmployeeNames, create, update, remove };
