const express = require('express');
const router = express.Router({ mergeParams: true });

router.use('/employees', require('./employeeRoutes'));
router.use('/attendance', require('./employeeAttendanceRoutes'));
router.use('/employee-duties', require('./employeeDutyRoutes'));
router.use('/tasks', require('./employeeTaskRoutes'));

router.use('/products', require('./productRoutes'));
router.use('/inventories', require('./inventoryRoutes'));
router.use('/inventory-logs', require('./inventoryLogRoutes'));
router.use('/guninfo', require('./gunInfoRoutes'));

router.use('/sales', require('./salesRoutes'));
router.use('/sale-history', require('./saleHistoryRoutes'));
router.use('/collections', require('./collectionsRoutes'));

router.use('/customers', require('./customerRoutes'));

router.use('/expenses', require('./expenseRoutes'));
router.use('/expense-categories', require('./expenseCategoryRoutes'));
router.use('/finance-summary', require('./financeSummaryRoutes'));
router.use('/profit-loss', require('./profitLossRoutes'));

router.use('/stock-register', require('./stockRegisterRoutes'));
router.use('/density-register', require('./densityRegisterRoutes'));
router.use('/documents', require('./documentRoutes'));
router.use('/bank-deposits', require('./bankDepositRoutes'));

router.use('/reports', require('./reportRoutes'));
router.use('/appsettings', require('./appSettingsRoutes'));

module.exports = router;
