const { ProfitLoss, Collections, Product, InventoryLog, Expense } = require('../models');
const { round2 } = require('../utils/dateTime');

function decimalToNumber(v) {
  if (v === undefined || v === null) return 0;
  return typeof v === 'object' && v.toString ? parseFloat(v.toString()) : Number(v);
}

async function calculateAndSaveProfitLoss(orgId) {
  const [collections, products, expenses] = await Promise.all([
    Collections.find({ organizationId: orgId }),
    Product.find({ organizationId: orgId }),
    Expense.find({ organizationId: orgId })
  ]);

  const cashReceived = collections.reduce((sum, c) => sum + (c.receivedTotal || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  let inventoryValue = 0;
  for (const product of products) {
    const latestLog = await InventoryLog.findOne({ productId: product._id.toString() }).sort({ lastUpdated: -1 });
    if (latestLog) {
      inventoryValue += decimalToNumber(latestLog.currentLevel) * (product.price || 0);
    }
  }

  const profitLoss = round2(cashReceived + inventoryValue - totalExpenses);

  return ProfitLoss.create({
    organizationId: orgId,
    cashReceived: round2(cashReceived),
    inventoryValue: round2(inventoryValue),
    totalExpenses: round2(totalExpenses),
    profitLoss,
    calculatedAt: new Date()
  });
}

async function getAll(orgId) {
  return ProfitLoss.find({ organizationId: orgId }).sort({ calculatedAt: -1 });
}

module.exports = { calculateAndSaveProfitLoss, getAll };
