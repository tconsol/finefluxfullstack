const { Customer, CustomerHistory } = require('../models');
const { ApiError } = require('../middleware/errorHandler');
const { parsePageable, paginate } = require('../utils/pagination');
const { startOfDayIst, endOfDayIst, startOfWeekIst, startOfMonthIst, endOfMonthIst, dayjs } = require('../config/timezone');

function decimalToNumber(v) {
  if (v === undefined || v === null) return 0;
  return typeof v === 'object' && v.toString ? parseFloat(v.toString()) : Number(v);
}

async function listByCustomer(orgId, custId, query) {
  return paginate(CustomerHistory, { organizationId: orgId, custId }, parsePageable(query), { sort: { transactionDate: -1 } });
}

async function latestN(orgId, custId, limit = 3) {
  return CustomerHistory.find({ organizationId: orgId, custId }).sort({ transactionDate: -1 }).limit(Number(limit));
}

async function listByOrg(orgId, query) {
  return paginate(CustomerHistory, { organizationId: orgId }, parsePageable(query), { sort: { transactionDate: -1 } });
}

async function listByOrgToday(orgId, query) {
  const filter = { organizationId: orgId, transactionDate: { $gte: startOfDayIst().toDate(), $lte: endOfDayIst().toDate() } };
  return paginate(CustomerHistory, filter, parsePageable(query), { sort: { transactionDate: -1 } });
}

async function listByOrgLastWeek(orgId, query) {
  const filter = { organizationId: orgId, transactionDate: { $gte: startOfWeekIst().toDate(), $lte: dayjs().toDate() } };
  return paginate(CustomerHistory, filter, parsePageable(query), { sort: { transactionDate: -1 } });
}

async function listByOrgMonth(orgId, query) {
  const filter = { organizationId: orgId, transactionDate: { $gte: startOfMonthIst().toDate(), $lte: endOfMonthIst().toDate() } };
  return paginate(CustomerHistory, filter, parsePageable(query), { sort: { transactionDate: -1 } });
}

async function listByOrgDateRange(orgId, from, to, query) {
  const filter = { organizationId: orgId, transactionDate: { $gte: new Date(from), $lte: new Date(to) } };
  return paginate(CustomerHistory, filter, parsePageable(query), { sort: { transactionDate: -1 } });
}

async function addTransaction(orgId, body) {
  const { custId, transactionAmount, transactionDate, notes } = body;

  const customer = await Customer.findOne({ custId, organizationId: orgId });
  if (!customer) throw new ApiError(404, 'Customer not found');

  const currentDebt = decimalToNumber(customer.amountBorrowed);

  if (notes === 'Opening balance on customer creation') {
    return CustomerHistory.create({
      organizationId: orgId,
      customerId: customer._id.toString(),
      custId,
      transactionAmount,
      cumulativeAmount: currentDebt,
      transactionDate: transactionDate || new Date(),
      notes
    });
  }

  const newDebt = Math.max(0, currentDebt - transactionAmount);

  if (transactionAmount < 0) {
    customer.totalBorrowedAmount = decimalToNumber(customer.totalBorrowedAmount) + Math.abs(transactionAmount);
  }
  customer.amountBorrowed = newDebt;

  const isPastDue = customer.dueDate && new Date(customer.dueDate) < new Date();
  if (isPastDue && newDebt > 0) {
    customer.status = 'OVERDUE';
  } else if (newDebt === 0) {
    customer.status = 'PAID';
  } else {
    customer.status = 'PARTIAL';
  }
  await customer.save();

  return CustomerHistory.create({
    organizationId: orgId,
    customerId: customer._id.toString(),
    custId,
    transactionAmount,
    cumulativeAmount: newDebt,
    transactionDate: transactionDate || new Date(),
    notes
  });
}

module.exports = {
  listByCustomer, latestN, listByOrg, listByOrgToday, listByOrgLastWeek, listByOrgMonth, listByOrgDateRange, addTransaction
};
