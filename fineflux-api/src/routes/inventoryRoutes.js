const express = require('express');
const router = express.Router({ mergeParams: true });
const ctrl = require('../controllers/inventoryController');

router.get('/', ctrl.list);
router.get('/:productId/latest', ctrl.getLatestInventory);
router.post('/', ctrl.create);
router.put('/:productId/employees/:empId', ctrl.update);
router.delete('/:inventoryId', ctrl.remove);

module.exports = router;
