const { Collections, Sales, SaleHistory } = require('../models');
const { ApiError } = require('../middleware/errorHandler');
const { toIstSecondPlus5, normalize, buildKey } = require('../utils/saleMatch');
const { startOfDayIst, dayjs } = require('../config/timezone');
const financeSummaryService = require('./financeSummaryService');

async function findMatchingSale(orgId, empId, productNorm, gunsNorm, istSecond, price) {
  const saleMatchKey = buildKey(istSecond, productNorm, gunsNorm, price);
  let sale = await Sales.findOne({ organizationId: orgId, saleMatchKey });
  if (sale) return sale;

  const dayStart = startOfDayIst(istSecond).toDate();
  const dayEnd = dayjs(dayStart).add(1, 'day').toDate();

  const candidates = await Sales.find({
    organizationId: orgId,
    empId,
    dateTime: { $gte: dayStart, $lt: dayEnd }
  });

  const filtered = candidates.filter((s) =>
    normalize(s.productName) === productNorm &&
    normalize(s.guns) === gunsNorm &&
    Math.abs(s.price - price) <= 0.01 &&
    new Date(s.dateTime).getTime() <= new Date(istSecond).getTime()
  );

  if (!filtered.length) return null;
  filtered.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
  return filtered[0];
}

async function getAll(orgId) {
  return Collections.find({ organizationId: orgId }).sort({ dateTime: -1 });
}

async function getBySaleId(orgId, saleId) {
  return Collections.find({ organizationId: orgId, saleId });
}

async function getByDateRange(orgId, from, to) {
  return Collections.find({
    organizationId: orgId,
    dateTime: { $gte: new Date(from), $lte: new Date(to) }
  }).sort({ dateTime: -1 });
}

async function create(orgId, dto) {
  const { empId, dateTime, cashReceived = 0, phonePay = 0, creditCard = 0, productName, guns, price, saleId } = dto;

  const istSecond = toIstSecondPlus5(dateTime);
  const productNorm = normalize(productName);
  const gunsNorm = normalize(guns);
  const saleMatchKey = buildKey(istSecond, productNorm, gunsNorm, price);

  // When the caller (our own frontend, right after creating the sale) already knows the
  // saleId, use it directly — the fuzzy time/price/product match below is ambiguous
  // whenever two sales share the same product+gun+price+timestamp (e.g. two batch entries
  // for the same 2T packet price added without changing the sale time), and picks the
  // wrong sale, silently clobbering that sale's history entry.
  const matchingSale = saleId
    ? await Sales.findOne({ organizationId: orgId, saleId })
    : await findMatchingSale(orgId, empId, productNorm, gunsNorm, istSecond, price);

  const expectedTotal = matchingSale ? matchingSale.salesInRupees : 0;
  const receivedTotal = cashReceived + phonePay + creditCard;
  const difference = receivedTotal - expectedTotal;

  const accessCollections = difference > 0 ? difference : 0;
  const shortCollections = difference > 0 ? 0 : expectedTotal - receivedTotal;

  const collection = await Collections.create({
    saleId: matchingSale ? matchingSale.saleId : undefined,
    saleMatchKey,
    organizationId: orgId,
    dateTime: istSecond,
    empId,
    cashReceived,
    phonePay,
    creditCard,
    shortCollections,
    productName,
    guns,
    expectedTotal,
    receivedTotal,
    accessCollections
  });

  await financeSummaryService.autoCreateFinanceSummary(orgId);

  if (matchingSale) {
    const historyPayload = {
      organizationId: orgId,
      saleId: matchingSale.saleId,
      dateTime: matchingSale.dateTime,
      saleEndTime: matchingSale.saleEndTime,
      saleCreatedAt: matchingSale.createdAt,
      productName: matchingSale.productName,
      guns: matchingSale.guns,
      empId: matchingSale.empId,
      openingStock: matchingSale.openingStock,
      closingStock: matchingSale.closingStock,
      testingTotal: matchingSale.testingTotal,
      salesInLiters: matchingSale.salesInLiters,
      price: matchingSale.price,
      salesInRupees: matchingSale.salesInRupees,
      cashReceived,
      phonePay,
      creditCard,
      shortCollections,
      receivedTotal,
      mutationby: 'create',
      lastUpdated: new Date()
    };

    await SaleHistory.findOneAndUpdate(
      { organizationId: orgId, saleId: matchingSale.saleId, mutationby: 'create' },
      { $set: historyPayload },
      { upsert: true, new: true }
    );
  }

  return collection;
}

async function update(orgId, id, body) {
  const collection = await Collections.findOneAndUpdate(
    { _id: id, organizationId: orgId },
    { $set: body },
    { new: true, runValidators: true }
  );
  if (!collection) throw new ApiError(404, 'Collection not found');
  return collection;
}

async function remove(orgId, id) {
  const collection = await Collections.findOneAndDelete({ _id: id, organizationId: orgId });
  if (!collection) throw new ApiError(404, 'Collection not found');
}

module.exports = { getAll, getBySaleId, getByDateRange, create, update, remove };
