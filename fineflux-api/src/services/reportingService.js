const { Sales, Inventory, Customer, Employee, FinanceSummary } = require('../models');
const { ApiError } = require('../middleware/errorHandler');
const { dayjs, startOfDayIst, endOfDayIst, startOfMonthIst, endOfMonthIst } = require('../config/timezone');

const ENTITY_CONFIG = {
  sales: { model: Sales, dateField: 'dateTime' },
  inventory: { model: Inventory, dateField: 'lastUpdated' },
  customer: { model: Customer, dateField: 'borrowDate' },
  employee: { model: Employee, dateField: 'joinedDate' },
  financesummary: { model: FinanceSummary, dateField: 'createdAt' }
};

function resolveDateRange(reportType, { day, year, month, from, to }) {
  switch ((reportType || '').toUpperCase()) {
    case 'DAY': {
      const d = day ? dayjs(day) : dayjs();
      return { fromDate: startOfDayIst(d.toDate()).toDate(), toDate: endOfDayIst(d.toDate()).toDate() };
    }
    case 'MONTH': {
      const ref = dayjs(`${year}-${String(month).padStart(2, '0')}-01`);
      return { fromDate: startOfMonthIst(ref.toDate()).toDate(), toDate: endOfMonthIst(ref.toDate()).toDate() };
    }
    case 'CUSTOM':
      return { fromDate: new Date(from), toDate: new Date(to) };
    default:
      throw new ApiError(400, `Unsupported reportType: ${reportType}`);
  }
}

function computeSummary(entityName, data) {
  switch (entityName) {
    case 'sales':
      return {
        totalSalesInLiters: data.reduce((s, d) => s + (d.salesInLiters || 0), 0),
        totalSalesInRupees: data.reduce((s, d) => s + (d.salesInRupees || 0), 0)
      };
    case 'customer':
      return {
        totalAmountBorrowed: data.reduce((s, d) => s + parseFloat(d.amountBorrowed?.toString() || '0'), 0)
      };
    case 'financesummary':
      return {
        totalCollected: data.reduce((s, d) => s + (d.total || 0), 0)
      };
    default:
      return {};
  }
}

async function getReport(orgId, entityName, reportType, params) {
  const config = ENTITY_CONFIG[entityName];
  if (!config) throw new ApiError(400, `Unknown report entity: ${entityName}`);

  const { fromDate, toDate } = resolveDateRange(reportType, params);
  const filter = { organizationId: orgId, [config.dateField]: { $gte: fromDate, $lte: toDate } };
  const data = await config.model.find(filter).sort({ [config.dateField]: 1 });

  return {
    entityName,
    reportType,
    fromDate,
    toDate,
    totalRecords: data.length,
    summary: computeSummary(entityName, data),
    data
  };
}

module.exports = { getReport };
