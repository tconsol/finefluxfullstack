const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/organizationController');

router.get('/', ctrl.list);
router.get('/by-org-id/:orgId', ctrl.getByOrgId);
router.get('/:id', ctrl.get);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
