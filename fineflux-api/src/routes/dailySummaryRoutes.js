const express = require('express');
const router = express.Router({ mergeParams: true });
const ctrl = require('../controllers/dailySummaryController');

router.get('/', ctrl.get);
router.get('/:date', ctrl.getDetail);

module.exports = router;
