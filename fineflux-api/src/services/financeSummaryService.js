const { FinanceSummary, Sales, Collections, Expense, Inventory } = require('../models');
const { ApiError } = require('../middleware/errorHandler');
const { startOfDayIst, endOfDayIst } = require('../config/timezone');
const { round2 } = require('../utils/dateTime');

const INVENTORY_PRODUCTS = [
  { key: 'petrolInventory', name: 'Petrol' },
  { key: 'dieselInventory', name: 'Diesel' },
  { key: 'premiumPetrolInventory', name: 'Premium Petrol' },
  { key: 'cngInventory', name: 'CNG' },
  { key: 'twoTInventory', name: '2T' }
];

function decimalToNumber(v) {
  if (v === undefined || v === null) return 0;
  return typeof v === 'object' && v.toString ? parseFloat(v.toString()) : Number(v);
}

async function autoCreateFinanceSummary(orgId) {
  const dayStart = startOfDayIst().toDate();
  const dayEnd = endOfDayIst().toDate();

  const [salesToday, collectionsToday, expensesToday] = await Promise.all([
    Sales.find({ organizationId: orgId, dateTime: { $gte: dayStart, $lte: dayEnd } }),
    Collections.find({ organizationId: orgId, dateTime: { $gte: dayStart, $lte: dayEnd } }),
    Expense.find({ organizationId: orgId, expenseDate: { $gte: dayStart, $lte: dayEnd } })
  ]);

  const salesRevenue = salesToday.reduce((sum, s) => sum + (s.salesInRupees || 0), 0);
  const cashReceived = collectionsToday.reduce((sum, c) => sum + (c.cashReceived || 0), 0);
  const phonePay = collectionsToday.reduce((sum, c) => sum + (c.phonePay || 0), 0);
  const creditCard = collectionsToday.reduce((sum, c) => sum + (c.creditCard || 0), 0);
  const totalExpenses = expensesToday.reduce((sum, e) => sum + (e.amount || 0), 0);

  const inventoryValues = {};
  for (const { key, name } of INVENTORY_PRODUCTS) {
    const latest = await Inventory.findOne({ organizationId: orgId, productName: name }).sort({ lastUpdated: -1 });
    inventoryValues[key] = latest ? decimalToNumber(latest.stockValue) : 0;
  }

  const totalRevenue = salesRevenue + Object.values(inventoryValues).reduce((a, b) => a + b, 0);
  const total = round2(totalRevenue - totalExpenses);

  const update = {
    organizationId: orgId,
    cashReceived: round2(cashReceived),
    phonePay: round2(phonePay),
    creditCard: round2(creditCard),
    ...Object.fromEntries(Object.entries(inventoryValues).map(([k, v]) => [k, round2(v)])),
    totalExpenses: round2(totalExpenses),
    total
  };

  let summary = await FinanceSummary.findOne({
    organizationId: orgId, createdAt: { $gte: dayStart, $lte: dayEnd }
  }).sort({ createdAt: -1 });

  if (summary) {
    Object.assign(summary, update);
    await summary.save();
  } else {
    summary = await FinanceSummary.create(update);
  }
  return summary;
}

async function getAllByOrg(orgId) {
  return FinanceSummary.find({ organizationId: orgId }).sort({ createdAt: -1 });
}

async function getLatestByOrg(orgId) {
  const summary = await FinanceSummary.findOne({ organizationId: orgId }).sort({ createdAt: -1 });
  if (!summary) throw new ApiError(404, 'No finance summary found for organization');
  return summary;
}

async function update(orgId, id, body) {
  const summary = await FinanceSummary.findOneAndUpdate(
    { _id: id, organizationId: orgId },
    { $set: body },
    { new: true, runValidators: true }
  );
  if (!summary) throw new ApiError(404, 'Finance summary not found');
  return summary;
}

module.exports = { autoCreateFinanceSummary, getAllByOrg, getLatestByOrg, update };
