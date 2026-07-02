const { v4: uuidv4 } = require('uuid');
const { Sales, Product, GunInfo, Inventory, InventoryLog, Collections, SaleHistory } = require('../models');
const { ApiError } = require('../middleware/errorHandler');
const { nowIst } = require('../config/timezone');
const { normalize, buildKey } = require('../utils/saleMatch');
const financeSummaryService = require('./financeSummaryService');

function decimalToNumber(v) {
  if (v === undefined || v === null) return 0;
  return typeof v === 'object' && v.toString ? parseFloat(v.toString()) : Number(v);
}

async function getAllSales(orgId) {
  return Sales.find({ organizationId: orgId }).sort({ dateTime: -1 });
}

async function getSaleById(orgId, id) {
  const sale = await Sales.findOne({ _id: id, organizationId: orgId });
  if (!sale) throw new ApiError(404, 'Sale not found');
  return sale;
}

async function getSalesByDateRange(orgId, from, to) {
  return Sales.find({ organizationId: orgId, dateTime: { $gte: new Date(from), $lte: new Date(to) } }).sort({ dateTime: -1 });
}

async function createSale(orgId, dto) {
  const { empId, productName, openingStock: dtoOpeningStock, closingStock, testingTotal = 0, price, guns } = dto;
  const dateTime = dto.dateTime ? new Date(dto.dateTime) : nowIst().toDate();

  const productNameTrimmed = (productName || '').trim();
  const product = await Product.findOne({
    organizationId: orgId,
    productName: { $regex: `^${productNameTrimmed}$`, $options: 'i' }
  });
  if (!product) throw new ApiError(404, 'Product not found');

  const gunInfo = await GunInfo.findOne({ organizationId: orgId, productName: productNameTrimmed, guns });
  const openingStock = gunInfo ? gunInfo.currentReading : (dtoOpeningStock || 0);

  const liters = Math.max(0, closingStock - openingStock - testingTotal);
  const amount = Math.max(0, liters * price);

  if (decimalToNumber(product.currentLevel) < liters) {
    throw new ApiError(400, 'Insufficient inventory for this sale');
  }

  const saleId = uuidv4();
  const saleMatchKey = buildKey(dateTime, normalize(productName), normalize(guns), price);

  const sale = await Sales.create({
    saleId,
    organizationId: orgId,
    dateTime,
    productName: productNameTrimmed,
    guns,
    empId,
    openingStock,
    closingStock,
    testingTotal,
    salesInLiters: liters,
    price,
    salesInRupees: amount,
    saleMatchKey
  });

  await financeSummaryService.autoCreateFinanceSummary(orgId);

  if (gunInfo) {
    gunInfo.currentReading = closingStock;
    await gunInfo.save();
  }

  product.currentLevel = decimalToNumber(product.currentLevel) - liters;
  await product.save();

  const latestInventory = await Inventory.findOne({ organizationId: orgId, productId: product._id.toString() }).sort({ lastUpdated: -1 });
  if (latestInventory) {
    latestInventory.currentLevel = product.currentLevel;
    latestInventory.stockValue = decimalToNumber(product.currentLevel) * (product.price || 0);
    await latestInventory.save();

    await InventoryLog.create({
      inventoryId: latestInventory._id.toString(),
      organizationId: orgId,
      productId: product._id.toString(),
      productName: product.productName,
      totalCapacity: product.tankCapacity,
      stockValue: latestInventory.stockValue,
      currentLevel: latestInventory.currentLevel,
      metric: product.metric,
      status: product.status,
      tankCapacity: product.tankCapacity,
      receiptQuantityInLitres: 0,
      mutationby: `inventory sale entry created by ${empId}`,
      empId
    });

    sale.inventoryId = latestInventory._id.toString();
    await sale.save();
  }

  return sale;
}

async function updateSale(orgId, id, body) {
  const sale = await Sales.findOneAndUpdate(
    { _id: id, organizationId: orgId },
    { $set: body },
    { new: true, runValidators: true }
  );
  if (!sale) throw new ApiError(404, 'Sale not found');
  return sale;
}

async function deleteSale(orgId, saleMongoId, employeeId) {
  const sale = await Sales.findOne({ _id: saleMongoId, organizationId: orgId });
  if (!sale) throw new ApiError(404, 'Sale not found');

  await Collections.deleteMany({ organizationId: orgId, saleId: sale.saleId });

  try {
    await SaleHistory.create({
      organizationId: orgId,
      saleId: sale.saleId,
      dateTime: sale.dateTime,
      productName: sale.productName,
      guns: sale.guns,
      empId: sale.empId,
      openingStock: sale.openingStock,
      closingStock: sale.closingStock,
      testingTotal: sale.testingTotal,
      salesInLiters: sale.salesInLiters,
      price: sale.price,
      salesInRupees: sale.salesInRupees,
      mutationby: 'sale_delete',
      lastUpdated: new Date()
    });
  } catch (err) {
    if (err.code !== 11000) throw err; // ignore duplicate-key from unique index, per spec
  }

  const gunInfo = await GunInfo.findOne({ organizationId: orgId, productName: sale.productName, guns: sale.guns });
  if (gunInfo) {
    gunInfo.currentReading = Math.max(0, gunInfo.currentReading - sale.salesInLiters);
    await gunInfo.save();
  }

  const product = await Product.findOne({ organizationId: orgId, productName: sale.productName });
  if (product) {
    product.currentLevel = decimalToNumber(product.currentLevel) + sale.salesInLiters;
    await product.save();
  }

  let inventory = null;
  if (sale.inventoryId) inventory = await Inventory.findOne({ _id: sale.inventoryId, organizationId: orgId });
  if (!inventory && product) {
    inventory = await Inventory.findOne({ organizationId: orgId, productId: product._id.toString() }).sort({ lastUpdated: -1 });
  }

  if (inventory) {
    inventory.currentLevel = decimalToNumber(inventory.currentLevel) + sale.salesInLiters;
    inventory.stockValue = sale.price * decimalToNumber(inventory.currentLevel);
    await inventory.save();

    await InventoryLog.create({
      inventoryId: inventory._id.toString(),
      organizationId: orgId,
      productId: inventory.productId,
      productName: inventory.productName,
      totalCapacity: inventory.tankCapacity,
      stockValue: inventory.stockValue,
      currentLevel: inventory.currentLevel,
      metric: inventory.metric,
      status: inventory.status,
      tankCapacity: inventory.tankCapacity,
      receiptQuantityInLitres: sale.salesInLiters,
      mutationby: `sale_delete by ${employeeId || 'system'}`,
      empId: employeeId
    });
  }

  await Sales.deleteOne({ _id: saleMongoId });

  await financeSummaryService.autoCreateFinanceSummary(orgId);
}

module.exports = { getAllSales, getSaleById, getSalesByDateRange, createSale, updateSale, deleteSale };
