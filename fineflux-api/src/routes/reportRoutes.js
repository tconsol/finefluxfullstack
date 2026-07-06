const express = require('express');
const router = express.Router({ mergeParams: true });
const ctrl = require('../controllers/reportController');

router.post('/', ctrl.getReport);
router.get('/sales', ctrl.getSalesReport);
router.get('/inventory', ctrl.getInventoryReport);
router.get('/customer', ctrl.getCustomerReport);
router.get('/employee', ctrl.getEmployeeReport);
router.get('/financesummary', ctrl.getFinanceSummaryReport);

module.exports = router;
