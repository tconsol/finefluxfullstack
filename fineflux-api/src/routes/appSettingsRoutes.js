const express = require('express');
const router = express.Router({ mergeParams: true });
const asyncHandler = require('../utils/asyncHandler');
const { Product } = require('../models');
const { ApiError } = require('../middleware/errorHandler');
const priceService = require('../services/productPriceUpdateService');

router.put('/products/:productId/price', asyncHandler(async (req, res) => {
  const { orgId, productId } = req.params;
  const { price, empId } = req.query;

  const belongsToOrg = await Product.exists({ _id: productId, organizationId: orgId });
  if (!belongsToOrg) throw new ApiError(404, 'Product not found for this organization');

  const result = await priceService.updateProductPrice(orgId, productId, parseFloat(price), empId);
  res.json(result);
}));

module.exports = router;
