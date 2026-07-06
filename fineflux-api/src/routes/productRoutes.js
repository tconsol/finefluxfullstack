const express = require('express');
const router = express.Router({ mergeParams: true });
const ctrl = require('../controllers/productController');

router.get('/', ctrl.list);
router.get('/:productId', ctrl.get);
router.post('/', ctrl.create);
router.put('/:productId', ctrl.update);
router.patch('/:productId/status', ctrl.updateStatus);
router.delete('/:productId', ctrl.remove);

module.exports = router;
