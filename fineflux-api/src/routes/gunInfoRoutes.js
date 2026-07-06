const express = require('express');
const router = express.Router({ mergeParams: true });
const { GunInfo } = require('../models');
const { crudFactory } = require('../utils/crudFactory');
const asyncHandler = require('../utils/asyncHandler');

const ctrl = crudFactory(GunInfo, { sort: { createdAt: -1 } });

router.get('/', asyncHandler(ctrl.list));
router.get('/:id', asyncHandler(ctrl.getById));
router.post('/', asyncHandler(ctrl.create));
router.put('/:id', asyncHandler(ctrl.update));
router.delete('/:id', asyncHandler(ctrl.remove));

module.exports = router;
