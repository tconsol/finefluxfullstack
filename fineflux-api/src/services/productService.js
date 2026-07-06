const { Product, Inventory, InventoryLog } = require('../models');
const { ApiError } = require('../middleware/errorHandler');

async function getAllProducts(orgId) {
  return Product.find({ organizationId: orgId }).sort({ createdAt: -1 });
}

async function getProduct(orgId, productId) {
  const product = await Product.findOne({ _id: productId, organizationId: orgId });
  if (!product) throw new ApiError(404, 'Product not found');
  return product;
}

async function createProduct(orgId, body) {
  const product = await Product.create({ ...body, organizationId: orgId });

  const inventory = await Inventory.create({
    organizationId: orgId,
    productId: product._id.toString(),
    productName: product.productName,
    totalCapacity: product.tankCapacity,
    stockValue: 0,
    currentLevel: product.currentLevel || 0,
    metric: product.metric,
    status: product.status,
    tankCapacity: product.tankCapacity,
    empId: product.empId
  });

  await InventoryLog.create({
    inventoryId: inventory._id.toString(),
    organizationId: orgId,
    productId: product._id.toString(),
    productName: product.productName,
    totalCapacity: product.tankCapacity,
    stockValue: inventory.stockValue,
    currentLevel: inventory.currentLevel,
    metric: product.metric,
    status: product.status,
    tankCapacity: product.tankCapacity,
    receiptQuantityInLitres: 0,
    mutationby: `product created by ${product.empId || 'system'}`,
    empId: product.empId
  });

  return product;
}

async function updateProduct(orgId, productId, body) {
  const product = await Product.findOneAndUpdate(
    { _id: productId, organizationId: orgId },
    { $set: body },
    { new: true, runValidators: true }
  );
  if (!product) throw new ApiError(404, 'Product not found');

  const inventories = await Inventory.find({ organizationId: orgId, productId: product._id.toString() });
  for (const inv of inventories) {
    inv.currentLevel = product.currentLevel;
    inv.stockValue = Number(product.currentLevel) * (product.price || 0);
    await inv.save();
  }

  const latestLog = await InventoryLog.findOne({ productId: product._id.toString() }).sort({ lastUpdated: -1 });
  if (latestLog) {
    latestLog.currentLevel = product.currentLevel;
    latestLog.stockValue = Number(product.currentLevel) * (product.price || 0);
    await latestLog.save();
  }

  return product;
}

async function updateProductStatus(orgId, productId, status) {
  const product = await Product.findOneAndUpdate(
    { _id: productId, organizationId: orgId },
    { $set: { status } },
    { new: true }
  );
  if (!product) throw new ApiError(404, 'Product not found');
  return product;
}

async function deleteProduct(orgId, productId) {
  const product = await Product.findOneAndDelete({ _id: productId, organizationId: orgId });
  if (!product) throw new ApiError(404, 'Product not found');
}

module.exports = { getAllProducts, getProduct, createProduct, updateProduct, updateProductStatus, deleteProduct };
