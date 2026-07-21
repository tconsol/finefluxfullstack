const { Sales, Collections, CustomerHistory, Expense, SalaryPayment, InventoryLog, Product } = require('../models');
const { dayjs, IST } = require('../config/timezone');
const { round2 } = require('../utils/dateTime');

function decimalToNumber(v) {
  if (v === undefined || v === null) return 0;
  return typeof v === 'object' && v.toString ? parseFloat(v.toString()) : Number(v);
}

function dayKey(date) {
  return dayjs(date).tz(IST).format('YYYY-MM-DD');
}

// Latest stockValue as of a given day, walking a chronologically-sorted log list with a
// running pointer so a day with no inventory activity carries forward the last known value.
function makeInventoryValueLookup(sortedLogsAsc) {
  let pointer = 0;
  let lastValue = 0;
  return (dayEnd) => {
    while (pointer < sortedLogsAsc.length && dayjs(sortedLogsAsc[pointer].lastUpdated).valueOf() <= dayEnd.valueOf()) {
      lastValue = decimalToNumber(sortedLogsAsc[pointer].stockValue);
      pointer += 1;
    }
    return lastValue;
  };
}

/**
 * Daily business-value rollup:
 *   total = handCash + phonePay + creditCard + inventoryValue (sum across every product)
 *           + borrowedMoney + borrowerCashReturned - expenses - salariesPaid
 */
async function getDailySummary(orgId, fromDate, toDate) {
  const rangeStart = dayjs(fromDate).tz(IST).startOf('day');
  const rangeEnd = dayjs(toDate).tz(IST).endOf('day');

  const [collections, historyTxns, expenses, salaryPayments, products] = await Promise.all([
    Collections.find({
      organizationId: orgId,
      dateTime: { $gte: rangeStart.toDate(), $lte: rangeEnd.toDate() }
    }),
    CustomerHistory.find({
      organizationId: orgId,
      transactionDate: { $gte: rangeStart.toDate(), $lte: rangeEnd.toDate() }
    }),
    Expense.find({
      organizationId: orgId,
      expenseDate: { $gte: rangeStart.toDate(), $lte: rangeEnd.toDate() }
    }),
    SalaryPayment.find({
      organizationId: orgId,
      paymentDate: { $gte: rangeStart.toDate(), $lte: rangeEnd.toDate() }
    }),
    Product.find({ organizationId: orgId })
  ]);

  // Every product the org has ever stocked (Petrol, Diesel, Premium Petrol, CNG, 2T,
  // whatever else gets added later) — not a hardcoded pair.
  const productNames = [...new Set(products.map((p) => p.productName).filter(Boolean))];

  const logsByProduct = await Promise.all(
    productNames.map((name) =>
      InventoryLog.find({
        organizationId: orgId,
        productName: { $regex: `^${name.trim()}$`, $options: 'i' },
        lastUpdated: { $lte: rangeEnd.toDate() }
      }).sort({ lastUpdated: 1 })
    )
  );

  const inventoryLookups = productNames.map((name, i) => ({
    name,
    valueAsOf: makeInventoryValueLookup(logsByProduct[i])
  }));

  const bucketsByDay = new Map();
  const ensureBucket = (key) => {
    if (!bucketsByDay.has(key)) {
      bucketsByDay.set(key, {
        handCash: 0, phonePay: 0, creditCard: 0,
        borrowedMoney: 0, borrowerCashReturned: 0,
        expenses: 0, salariesPaid: 0
      });
    }
    return bucketsByDay.get(key);
  };

  for (const c of collections) {
    const b = ensureBucket(dayKey(c.dateTime));
    b.handCash += Number(c.cashReceived) || 0;
    b.phonePay += Number(c.phonePay) || 0;
    b.creditCard += Number(c.creditCard) || 0;
  }

  for (const t of historyTxns) {
    const b = ensureBucket(dayKey(t.transactionDate));
    const amount = decimalToNumber(t.transactionAmount);
    if (amount < 0) b.borrowedMoney += Math.abs(amount);
    else if (amount > 0) b.borrowerCashReturned += amount;
  }

  for (const e of expenses) {
    const b = ensureBucket(dayKey(e.expenseDate));
    b.expenses += Number(e.amount) || 0;
  }

  for (const s of salaryPayments) {
    const b = ensureBucket(dayKey(s.paymentDate));
    b.salariesPaid += Number(s.amount) || 0;
  }

  const days = [];
  let cursor = rangeStart.clone();
  while (cursor.isBefore(rangeEnd) || cursor.isSame(rangeEnd, 'day')) {
    const key = cursor.format('YYYY-MM-DD');
    const b = ensureBucket(key);
    const dayEnd = cursor.endOf('day');

    const inventoryByProduct = {};
    let inventoryValue = 0;
    for (const { name, valueAsOf } of inventoryLookups) {
      const value = round2(valueAsOf(dayEnd));
      inventoryByProduct[name] = value;
      inventoryValue += value;
    }
    inventoryValue = round2(inventoryValue);

    const total = round2(
      b.handCash + b.phonePay + b.creditCard +
      inventoryValue +
      b.borrowedMoney + b.borrowerCashReturned -
      b.expenses - b.salariesPaid
    );

    days.push({
      date: key,
      handCash: round2(b.handCash),
      phonePay: round2(b.phonePay),
      creditCard: round2(b.creditCard),
      inventoryValue,
      inventoryByProduct,
      borrowedMoney: round2(b.borrowedMoney),
      borrowerCashReturned: round2(b.borrowerCashReturned),
      expenses: round2(b.expenses),
      salariesPaid: round2(b.salariesPaid),
      total
    });

    cursor = cursor.add(1, 'day');
  }

  // Newest first for display.
  return days.reverse();
}

async function getDayDetail(orgId, dateStr) {
  const dayStart = dayjs(dateStr).tz(IST).startOf('day');
  const dayEnd = dayjs(dateStr).tz(IST).endOf('day');
  const prevDayEnd = dayStart.subtract(1, 'millisecond');

  const [sales, collections, expenses, salaryPayments, customerHistory, products, inventoryLogsToday] = await Promise.all([
    Sales.find({ organizationId: orgId, dateTime: { $gte: dayStart.toDate(), $lte: dayEnd.toDate() } }).sort({ dateTime: 1 }),
    Collections.find({ organizationId: orgId, dateTime: { $gte: dayStart.toDate(), $lte: dayEnd.toDate() } }).sort({ dateTime: 1 }),
    Expense.find({ organizationId: orgId, expenseDate: { $gte: dayStart.toDate(), $lte: dayEnd.toDate() } }).sort({ expenseDate: 1 }),
    SalaryPayment.find({ organizationId: orgId, paymentDate: { $gte: dayStart.toDate(), $lte: dayEnd.toDate() } }).sort({ paymentDate: 1 }),
    CustomerHistory.find({ organizationId: orgId, transactionDate: { $gte: dayStart.toDate(), $lte: dayEnd.toDate() } }).sort({ transactionDate: 1 }),
    Product.find({ organizationId: orgId }),
    InventoryLog.find({ organizationId: orgId, lastUpdated: { $gte: dayStart.toDate(), $lte: dayEnd.toDate() } }).sort({ lastUpdated: 1 })
  ]);

  const inventory = await Promise.all(products.map(async (p) => {
    const [previousLog, currentLog] = await Promise.all([
      InventoryLog.findOne({
        organizationId: orgId,
        productName: { $regex: `^${p.productName.trim()}$`, $options: 'i' },
        lastUpdated: { $lte: prevDayEnd.toDate() }
      }).sort({ lastUpdated: -1 }),
      InventoryLog.findOne({
        organizationId: orgId,
        productName: { $regex: `^${p.productName.trim()}$`, $options: 'i' },
        lastUpdated: { $lte: dayEnd.toDate() }
      }).sort({ lastUpdated: -1 })
    ]);

    return {
      productName: p.productName,
      metric: p.metric,
      previousLevel: previousLog ? round2(decimalToNumber(previousLog.currentLevel)) : 0,
      previousValue: previousLog ? round2(decimalToNumber(previousLog.stockValue)) : 0,
      currentLevel: currentLog ? round2(decimalToNumber(currentLog.currentLevel)) : 0,
      currentValue: currentLog ? round2(decimalToNumber(currentLog.stockValue)) : 0
    };
  }));

  return {
    date: dateStr,
    sales,
    collections,
    expenses,
    salaryPayments,
    customerHistory,
    inventory,
    inventoryLogsToday
  };
}

module.exports = { getDailySummary, getDayDetail };
