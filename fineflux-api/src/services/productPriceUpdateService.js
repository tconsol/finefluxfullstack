const { Product, Inventory, InventoryLog } = require('../models');
const { ApiError } = require('../middleware/errorHandler');

function decimalToNumber(v) {
  if (v === undefined || v === null) return 0;
  return typeof v === 'object' && v.toString ? parseFloat(v.toString()) : Number(v);
}

async function updateProductPrice(orgId, productId, newPrice, empId) {
  const product = await Product.findOne({ _id: productId, organizationId: orgId });
  if (!product) throw new ApiError(404, 'Product not found');

  product.price = newPrice;
  const productStockValue = decimalToNumber(product.currentLevel) * newPrice;
  await product.save();

  const inventories = await Inventory.find({ organizationId: orgId, productId });
  for (const inv of inventories) {
    inv.stockValue = decimalToNumber(inv.currentLevel) * newPrice;
    await inv.save();

    await InventoryLog.create({
      inventoryId: inv._id.toString(),
      organizationId: orgId,
      productId,
      productName: product.productName,
      totalCapacity: inv.tankCapacity,
      stockValue: inv.stockValue,
      currentLevel: inv.currentLevel,
      metric: inv.metric,
      status: inv.status,
      tankCapacity: inv.tankCapacity,
      receiptQuantityInLitres: 0,
      mutationby: `price updated to ${newPrice} by ${empId || 'system'}`,
      empId
    });
  }

  return { product, productStockValue };
}

module.exports = { updateProductPrice };
