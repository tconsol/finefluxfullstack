const express = require('express');
const router = express.Router({ mergeParams: true });
const ctrl = require('../controllers/employeeController');
const recoveryCtrl = require('../controllers/employeeRecoveryController');

router.post('/forgot-password', recoveryCtrl.forgotPassword);
router.post('/reset-password', recoveryCtrl.resetPassword);
router.post('/forgot-username', recoveryCtrl.forgotUsername);

router.get('/', ctrl.list);
router.get('/:id', ctrl.get);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.put('/:id/change-password', ctrl.changePassword);

module.exports = router;
