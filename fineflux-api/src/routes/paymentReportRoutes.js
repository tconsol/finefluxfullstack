const express = require('express');
const router = express.Router({ mergeParams: true });
const ctrl = require('../controllers/paymentTransactionController');

router.get('/providers', ctrl.providers);
router.get('/today', ctrl.today);
router.get('/history', ctrl.history);
router.get('/settlements', ctrl.settlements);

module.exports = router;
