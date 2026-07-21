const express = require('express');
const router = express.Router({ mergeParams: true });
const ctrl = require('../controllers/salaryPaymentController');

router.get('/', ctrl.list);
router.get('/by-date', ctrl.getByDateRange);
router.post('/', ctrl.create);
router.delete('/:id', ctrl.remove);

module.exports = router;
