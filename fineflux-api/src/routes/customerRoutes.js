const express = require('express');
const router = express.Router({ mergeParams: true });
const ctrl = require('../controllers/customerController');
const histCtrl = require('../controllers/customerHistoryController');

// History sub-routes (declared before /:id so they aren't swallowed by the id param).
router.get('/history/cust/:custId', histCtrl.listByCustId);
router.get('/history/latest', histCtrl.latest);
router.get('/history/all/today', histCtrl.todayOrg);
router.get('/history/all/week', histCtrl.weekOrg);
router.get('/history/all/month', histCtrl.monthOrg);
router.get('/history/all/range', histCtrl.rangeOrg);
router.get('/history/all', histCtrl.listAll);
router.get('/history', histCtrl.listAll);
router.post('/history', histCtrl.add);

router.get('/today', ctrl.getToday);
router.get('/week', ctrl.getWeek);
router.get('/month', ctrl.getMonth);
router.get('/range', ctrl.getRange);

router.get('/', ctrl.list);
router.delete('/', ctrl.deleteAllForOrg); // supports ?custId= via deleteByCustIdQuery semantics in controller
router.get('/:id', ctrl.get);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.put('/:id/lifecycle-status', ctrl.updateLifecycleStatus);
router.delete('/by-cust/:custId', ctrl.deleteByCustId);
router.delete('/:id', ctrl.remove);

module.exports = router;
