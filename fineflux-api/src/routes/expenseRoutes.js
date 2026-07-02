const express = require('express');
const router = express.Router({ mergeParams: true });
const ctrl = require('../controllers/expenseController');

router.get('/', ctrl.getAll);
router.get('/search/employee/all', ctrl.getAllEmployeeNames);
router.get('/search/employee', ctrl.searchByEmployeeName);
router.get('/search/category', ctrl.searchByCategory);
router.get('/search/date/range', ctrl.searchByDateRange);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
