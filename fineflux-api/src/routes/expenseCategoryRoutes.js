const express = require('express');
const router = express.Router({ mergeParams: true });
const asyncHandler = require('../utils/asyncHandler');
const { ExpenseCategory } = require('../models');
const { ApiError } = require('../middleware/errorHandler');

router.get('/', asyncHandler(async (req, res) => {
  res.json(await ExpenseCategory.find({ organizationId: req.params.orgId }).sort({ createdAt: -1 }));
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const doc = await ExpenseCategory.findOne({ _id: req.params.id, organizationId: req.params.orgId });
  if (!doc) throw new ApiError(404, 'Expense category not found');
  res.json(doc);
}));

router.post('/', asyncHandler(async (req, res) => {
  const exists = await ExpenseCategory.exists({ organizationId: req.params.orgId, categoryName: req.body.categoryName });
  if (exists) throw new ApiError(409, 'Category name already exists for this organization');
  const doc = await ExpenseCategory.create({ ...req.body, organizationId: req.params.orgId });
  res.status(201).json(doc);
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const doc = await ExpenseCategory.findOneAndUpdate(
    { _id: req.params.id, organizationId: req.params.orgId },
    { $set: { categoryName: req.body.categoryName } },
    { new: true, runValidators: true }
  );
  if (!doc) throw new ApiError(404, 'Expense category not found');
  res.json(doc);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const doc = await ExpenseCategory.findOneAndDelete({ _id: req.params.id, organizationId: req.params.orgId });
  if (!doc) throw new ApiError(404, 'Expense category not found');
  res.status(204).send();
}));

module.exports = router;
