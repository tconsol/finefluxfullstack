const { Inventory, InventoryLog, Product } = require('../models');
const { ApiError } = require('../middleware/errorHandler');
const financeSummaryService = require('./financeSummaryService');
const profitLossService = require('./profitLossService');

function decimalToNumber(v) {
  if (v === undefined || v === null) return 0;
  return typeof v === 'object' && v.toString ? parseFloat(v.toString()) : Number(v);
}

async function getAllInventories(orgId) {
  return Inventory.find({ organizationId: orgId }).sort({ lastUpdated: -1 });
}

async function getLatestInventory(orgId, productId) {
  const inv = await Inventory.findOne({ organizationId: orgId, productId }).sort({ lastUpdated: -1 });
  if (!inv) throw new ApiError(404, 'No inventory found for product');
  return inv;
}

async function createInventory(orgId, body) {
  const { productId, increment = 0, empId } = body;
  const product = await Product.findOne({ _id: productId, organizationId: orgId });
  if (!product) throw new ApiError(404, 'Product not found');
  if (!product.status) throw new ApiError(400, 'Product is not active');

  const previousLog = await InventoryLog.findOne({ productId }).sort({ lastUpdated: -1 });
  const previousLevel = previousLog ? decimalToNumber(previousLog.currentLevel) : 0;

  const newLevel = previousLevel + Number(increment);
  const tankCapacity = decimalToNumber(product.tankCapacity);
  if (tankCapacity && newLevel > tankCapacity) {
    throw new ApiError(400, 'New level exceeds tank capacity');
  }

  const stockValue = newLevel * (product.price || 0);

  const inventory = await Inventory.create({
    organizationId: orgId,
    productId,
    productName: product.productName,
    totalCapacity: product.tankCapacity,
    stockValue,
    currentLevel: newLevel,
    metric: product.metric,
    status: product.status,
    tankCapacity: product.tankCapacity,
    empId
  });

  product.currentLevel = newLevel;
  await product.save();

  await InventoryLog.create({
    inventoryId: inventory._id.toString(),
    organizationId: orgId,
    productId,
    productName: product.productName,
    totalCapacity: product.tankCapacity,
    stockValue,
    currentLevel: newLevel,
    metric: product.metric,
    status: product.status,
    tankCapacity: product.tankCapacity,
    receiptQuantityInLitres: 0,
    mutationby: `inventory created by ${empId || 'system'}`,
    empId
  });

  await profitLossService.calculateAndSaveProfitLoss(orgId);

  return inventory;
}

async function updateInventory(orgId, productId, empId, body) {
  const { increment = 0 } = body;
  const product = await Product.findOne({ _id: productId, organizationId: orgId });
  if (!product) throw new ApiError(404, 'Product not found');

  const previousLog = await InventoryLog.findOne({ productId }).sort({ lastUpdated: -1 });
  const previousLevel = previousLog ? decimalToNumber(previousLog.currentLevel) : 0;

  const newLevel = previousLevel + Number(increment);
  const tankCapacity = decimalToNumber(product.tankCapacity);
  if (tankCapacity && newLevel > tankCapacity) {
    throw new ApiError(400, 'New level exceeds tank capacity');
  }

  const stockValue = newLevel * (product.price || 0);

  const inventory = await Inventory.create({
    organizationId: orgId,
    productId,
    productName: product.productName,
    totalCapacity: product.tankCapacity,
    stockValue,
    currentLevel: newLevel,
    metric: product.metric,
    status: product.status,
    tankCapacity: product.tankCapacity,
    empId
  });

  product.currentLevel = newLevel;
  await product.save();

  await InventoryLog.create({
    inventoryId: inventory._id.toString(),
    organizationId: orgId,
    productId,
    productName: product.productName,
    totalCapacity: product.tankCapacity,
    stockValue,
    currentLevel: newLevel,
    metric: product.metric,
    status: product.status,
    tankCapacity: product.tankCapacity,
    receiptQuantityInLitres: increment,
    mutationby: `inventory updated by ${empId || 'system'}`,
    empId
  });

  await financeSummaryService.autoCreateFinanceSummary(orgId);

  return inventory;
}

async function deleteInventory(orgId, inventoryId, empId) {
  const inventory = await Inventory.findOne({ _id: inventoryId, organizationId: orgId });
  if (!inventory) throw new ApiError(404, 'Inventory not found');

  let previousLog = await InventoryLog.findOne({
    productId: inventory.productId,
    lastUpdated: { $lt: inventory.lastUpdated }
  }).sort({ lastUpdated: -1 });

  if (!previousLog) {
    previousLog = await InventoryLog.findOne({
      productId: inventory.productId,
      inventoryId: { $ne: inventoryId }
    }).sort({ lastUpdated: -1 });
  }

  const restoredLevel = previousLog ? decimalToNumber(previousLog.currentLevel) : 0;

  const product = await Product.findOne({ _id: inventory.productId, organizationId: orgId });
  if (product) {
    product.currentLevel = restoredLevel;
    await product.save();
  }

  await InventoryLog.create({
    inventoryId: inventory._id.toString(),
    organizationId: orgId,
    productId: inventory.productId,
    productName: inventory.productName,
    totalCapacity: inventory.tankCapacity,
    stockValue: restoredLevel * (product?.price || 0),
    currentLevel: restoredLevel,
    metric: inventory.metric,
    status: inventory.status,
    tankCapacity: inventory.tankCapacity,
    receiptQuantityInLitres: 0,
    mutationby: `inventory deleted by ${empId || 'system'}`,
    empId
  });

  await Inventory.deleteOne({ _id: inventoryId });

  const remaining = await Inventory.findOne({ productId: inventory.productId }).sort({ lastUpdated: -1 });
  if (remaining) {
    remaining.currentLevel = restoredLevel;
    remaining.stockValue = restoredLevel * (product?.price || 0);
    await remaining.save();
  }
}

module.exports = { getAllInventories, getLatestInventory, createInventory, updateInventory, deleteInventory };
