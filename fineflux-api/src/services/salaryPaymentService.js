const { SalaryPayment } = require('../models');
const { ApiError } = require('../middleware/errorHandler');

async function list(orgId) {
  return SalaryPayment.find({ organizationId: orgId }).sort({ paymentDate: -1 });
}

async function getByDateRange(orgId, from, to) {
  return SalaryPayment.find({
    organizationId: orgId,
    paymentDate: { $gte: new Date(from), $lte: new Date(to) }
  }).sort({ paymentDate: -1 });
}

async function create(orgId, body) {
  return SalaryPayment.create({ ...body, organizationId: orgId });
}

async function remove(orgId, id) {
  const doc = await SalaryPayment.findOneAndDelete({ _id: id, organizationId: orgId });
  if (!doc) throw new ApiError(404, 'Salary payment not found');
}

module.exports = { list, getByDateRange, create, remove };
