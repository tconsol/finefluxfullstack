const express = require('express');
const router = express.Router({ mergeParams: true });
const ctrl = require('../controllers/inventoryLogController');

router.get('/', ctrl.getAllLogs);
router.get('/by-product', ctrl.getLogsByProductName);
router.get('/:id', ctrl.getLogById);
router.delete('/:id', ctrl.deleteLog);

module.exports = router;
