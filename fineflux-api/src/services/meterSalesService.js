const { Sales } = require('../models');
const { dayjs, IST } = require('../config/timezone');

async function getMeterSalesSummary(orgId, product) {
  const productNorm = (product || '').trim().toLowerCase();

  const sales = await Sales.find({ organizationId: orgId }).sort({ dateTime: 1 });
  const filtered = sales.filter((s) => (s.productName || '').trim().toLowerCase() === productNorm);

  const guns = [...new Set(filtered.map((s) => s.guns).filter(Boolean))].sort();

  const byDate = new Map();
  for (const sale of filtered) {
    const dateKey = dayjs(sale.dateTime).tz(IST).format('YYYY-MM-DD');
    if (!byDate.has(dateKey)) {
      byDate.set(dateKey, {
        date: dateKey,
        openingReadingsPerGun: {},
        salesInLitersPerGun: {},
        testingTotal: 0,
        asPerMeterSale: 0,
        cumulativeLiters: 0
      });
    }
    const bucket = byDate.get(dateKey);

    if (bucket.openingReadingsPerGun[sale.guns] === undefined) {
      bucket.openingReadingsPerGun[sale.guns] = sale.openingStock;
    }
    bucket.salesInLitersPerGun[sale.guns] = (bucket.salesInLitersPerGun[sale.guns] || 0) + sale.salesInLiters;
    bucket.testingTotal += sale.testingTotal || 0;
    bucket.asPerMeterSale += sale.salesInLiters || 0;
  }

  const sortedDates = [...byDate.keys()].sort();
  let cumulative = 0;
  const result = sortedDates.map((dateKey) => {
    const bucket = byDate.get(dateKey);
    cumulative += bucket.asPerMeterSale;
    bucket.cumulativeLiters = cumulative;
    for (const g of guns) {
      if (bucket.openingReadingsPerGun[g] === undefined) bucket.openingReadingsPerGun[g] = null;
      if (bucket.salesInLitersPerGun[g] === undefined) bucket.salesInLitersPerGun[g] = 0;
    }
    return bucket;
  });

  return result;
}

module.exports = { getMeterSalesSummary };
