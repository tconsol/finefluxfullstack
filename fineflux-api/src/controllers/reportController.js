const asyncHandler = require('../utils/asyncHandler');
const svc = require('../services/reportingService');

exports.getReport = asyncHandler(async (req, res) => {
  const { entityName, reportType, ...params } = req.body;
  res.json(await svc.getReport(req.params.orgId, entityName, reportType, params));
});

function buildGetter(entityName) {
  return asyncHandler(async (req, res) => {
    const { reportType, day, year, month, from, to } = req.query;
    res.json(await svc.getReport(req.params.orgId, entityName, reportType, { day, year, month, from, to }));
  });
}

exports.getSalesReport = buildGetter('sales');
exports.getInventoryReport = buildGetter('inventory');
exports.getCustomerReport = buildGetter('customer');
exports.getEmployeeReport = buildGetter('employee');
exports.getFinanceSummaryReport = buildGetter('financesummary');
