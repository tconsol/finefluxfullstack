const express = require('express');
const router = express.Router({ mergeParams: true });
const ctrl = require('../controllers/employeeAttendanceController');

router.get('/', ctrl.getAllByOrg);
router.get('/daterange', ctrl.getByDateRange);
router.get('/employee/:empId', ctrl.getByEmpId);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
