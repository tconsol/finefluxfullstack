const { Customer, CustomerHistory } = require('../models');
const { ApiError } = require('../middleware/errorHandler');
const { parsePageable, paginate } = require('../utils/pagination');
const { startOfDayIst, endOfDayIst, startOfWeekIst, startOfMonthIst, endOfMonthIst, dayjs } = require('../config/timezone');

async function list(orgId, query) {
  return paginate(Customer, { organizationId: orgId }, parsePageable(query));
}

async function get(orgId, id) {
  const customer = await Customer.findOne({ _id: id, organizationId: orgId });
  if (!customer) throw new ApiError(404, 'Customer not found');
  return customer;
}

async function getByBorrowDateRange(orgId, from, to) {
  return Customer.find({ organizationId: orgId, borrowDate: { $gte: from, $lte: to } }).sort({ borrowDate: -1 });
}

async function getTodayCustomers(orgId) {
  return getByBorrowDateRange(orgId, startOfDayIst().toDate(), endOfDayIst().toDate());
}

async function getWeekCustomers(orgId) {
  return getByBorrowDateRange(orgId, startOfWeekIst().toDate(), dayjs().toDate());
}

async function getMonthCustomers(orgId) {
  return getByBorrowDateRange(orgId, startOfMonthIst().toDate(), endOfMonthIst().toDate());
}

async function getCustomersByDateRange(orgId, from, to) {
  return getByBorrowDateRange(orgId, new Date(from), new Date(to));
}

async function create(orgId, body) {
  if (body.lifecycleStatus === 'INACTIVE') {
    throw new ApiError(403, 'Cannot create customer with INACTIVE lifecycle status');
  }
  const amountBorrowed = body.amountBorrowed || 0;

  const customer = await Customer.create({
    ...body,
    organizationId: orgId,
    totalBorrowedAmount: amountBorrowed
  });

  if (amountBorrowed > 0) {
    await CustomerHistory.create({
      organizationId: orgId,
      customerId: customer._id.toString(),
      custId: customer.custId,
      transactionAmount: -amountBorrowed,
      cumulativeAmount: amountBorrowed,
      transactionDate: customer.borrowDate || new Date(),
      notes: 'Opening balance on customer creation'
    });
  }

  return customer;
}

async function update(orgId, id, body) {
  const existing = await Customer.findOne({ _id: id, organizationId: orgId });
  if (!existing) throw new ApiError(404, 'Customer not found');
  if (existing.lifecycleStatus === 'INACTIVE' && body.lifecycleStatus !== 'ACTIVE') {
    throw new ApiError(403, 'Cannot update an INACTIVE customer');
  }

  Object.assign(existing, body);
  await existing.save();
  return existing;
}

async function updateLifecycleStatus(orgId, id, lifecycleStatus) {
  const customer = await Customer.findOneAndUpdate(
    { _id: id, organizationId: orgId },
    { $set: { lifecycleStatus } },
    { new: true, runValidators: true }
  );
  if (!customer) throw new ApiError(404, 'Customer not found');
  return customer;
}

async function remove(orgId, id) {
  const customer = await Customer.findOneAndDelete({ _id: id, organizationId: orgId });
  if (!customer) throw new ApiError(404, 'Customer not found');
}

async function deleteByCustId(orgId, custId) {
  const customer = await Customer.findOneAndDelete({ custId, organizationId: orgId });
  if (!customer) throw new ApiError(404, 'Customer not found');
}

async function deleteAllForOrganization(orgId) {
  await Customer.deleteMany({ organizationId: orgId });
}

module.exports = {
  list, get, getTodayCustomers, getWeekCustomers, getMonthCustomers, getCustomersByDateRange,
  create, update, updateLifecycleStatus, remove, deleteByCustId, deleteAllForOrganization
};
