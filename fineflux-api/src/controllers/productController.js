const asyncHandler = require('../utils/asyncHandler');
const svc = require('../services/productService');

exports.list = asyncHandler(async (req, res) => res.json(await svc.getAllProducts(req.params.orgId)));
exports.get = asyncHandler(async (req, res) => res.json(await svc.getProduct(req.params.orgId, req.params.productId)));
exports.create = asyncHandler(async (req, res) => res.status(201).json(await svc.createProduct(req.params.orgId, req.body)));
exports.update = asyncHandler(async (req, res) => res.json(await svc.updateProduct(req.params.orgId, req.params.productId, req.body)));
exports.updateStatus = asyncHandler(async (req, res) =>
  res.json(await svc.updateProductStatus(req.params.orgId, req.params.productId, req.query.status === 'true')));
exports.remove = asyncHandler(async (req, res) => {
  await svc.deleteProduct(req.params.orgId, req.params.productId);
  res.status(204).send();
});
