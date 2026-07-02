const express = require('express');
const router = express.Router({ mergeParams: true });
const ctrl = require('../controllers/salesController');

router.get('/', ctrl.getAll);
router.get('/by-date', ctrl.getByDateRange);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:saleId', ctrl.remove);

module.exports = router;
