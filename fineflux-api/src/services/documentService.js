const { Document } = require('../models');
const { ApiError } = require('../middleware/errorHandler');
const { parsePageable, paginate } = require('../utils/pagination');
const { generateSignedUrl, uploadFileToGcs } = require('../utils/gcsUpload');

async function list(orgId, query) {
  return paginate(Document, { organizationId: orgId }, parsePageable(query));
}

async function get(orgId, id) {
  const doc = await Document.findOne({ _id: id, organizationId: orgId });
  if (!doc) throw new ApiError(404, 'Document not found');
  return doc;
}

async function generateDownloadUrl(orgId, documentId, durationSeconds = 60) {
  const document = await get(orgId, documentId);
  return generateSignedUrl(document.fileUrl, durationSeconds);
}

async function create(orgId, body) {
  return Document.create({ ...body, organizationId: orgId });
}

async function update(orgId, id, body) {
  const doc = await Document.findOneAndUpdate(
    { _id: id, organizationId: orgId },
    { $set: body },
    { new: true, runValidators: true }
  );
  if (!doc) throw new ApiError(404, 'Document not found');
  return doc;
}

async function remove(orgId, id) {
  const doc = await Document.findOneAndDelete({ _id: id, organizationId: orgId });
  if (!doc) throw new ApiError(404, 'Document not found');
}

module.exports = { list, get, generateDownloadUrl, uploadFileToGcs, create, update, remove };
