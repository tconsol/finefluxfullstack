const express = require('express');
const router = express.Router({ mergeParams: true });
const ctrl = require('../controllers/collectionsController');

router.get('/', ctrl.getAll);
router.get('/by-sale/:saleId', ctrl.getBySaleId);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
