const express = require('express');
const router = express.Router({ mergeParams: true });
const ctrl = require('../controllers/employeeDutyController');

router.get('/', ctrl.getAll);
router.get('/employee/:empId/date-range', ctrl.getByEmployeeAndDateRange);
router.get('/employee/:empId', ctrl.getByEmployee);
router.get('/status/:status', ctrl.getByStatus);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
