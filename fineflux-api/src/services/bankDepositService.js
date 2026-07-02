const { BankDeposit } = require('../models');
const { ApiError } = require('../middleware/errorHandler');
const { parsePageable, paginate } = require('../utils/pagination');
const { generateSignedUrl, uploadFileToGcs } = require('../utils/gcsUpload');

async function list(orgId, query) {
  return paginate(BankDeposit, { organizationId: orgId }, parsePageable(query), { sort: { depositDate: -1 } });
}

async function get(orgId, id) {
  const deposit = await BankDeposit.findOne({ _id: id, organizationId: orgId });
  if (!deposit) throw new ApiError(404, 'Bank deposit not found');
  return deposit;
}

async function generateDownloadUrl(orgId, id, durationSeconds = 60) {
  const deposit = await get(orgId, id);
  if (!deposit.receiptUrl) throw new ApiError(404, 'No receipt attached to this deposit');
  return generateSignedUrl(deposit.receiptUrl, durationSeconds);
}

async function create(orgId, body) {
  return BankDeposit.create({ ...body, organizationId: orgId });
}

async function update(orgId, id, body) {
  const deposit = await BankDeposit.findOneAndUpdate(
    { _id: id, organizationId: orgId },
    { $set: body },
    { new: true, runValidators: true }
  );
  if (!deposit) throw new ApiError(404, 'Bank deposit not found');
  return deposit;
}

async function remove(orgId, id) {
  const deposit = await BankDeposit.findOneAndDelete({ _id: id, organizationId: orgId });
  if (!deposit) throw new ApiError(404, 'Bank deposit not found');
}

module.exports = { list, get, generateDownloadUrl, uploadFileToGcs, create, update, remove };
