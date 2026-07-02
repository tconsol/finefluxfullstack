const { Document } = require('../models');
const { ApiError } = require('../middleware/errorHandler');
const { parsePageable, paginate } = require('../utils/pagination');
const { bucket } = require('../config/gcs');
const env = require('../config/env');

async function list(orgId, query) {
  return paginate(Document, { organizationId: orgId }, parsePageable(query));
}

async function get(orgId, id) {
  const doc = await Document.findOne({ _id: id, organizationId: orgId });
  if (!doc) throw new ApiError(404, 'Document not found');
  return doc;
}

function blobPathFromUrl(fileUrl) {
  const prefix = `https://storage.googleapis.com/${env.gcsBucket}/`;
  if (!fileUrl.startsWith(prefix)) throw new ApiError(400, 'Unrecognized file URL');
  return fileUrl.slice(prefix.length);
}

async function generateDownloadUrl(orgId, documentId, durationSeconds = 60) {
  const document = await get(orgId, documentId);
  const blobPath = blobPathFromUrl(document.fileUrl);
  const [signedUrl] = await bucket.file(blobPath).getSignedUrl({
    action: 'read',
    expires: Date.now() + Number(durationSeconds) * 1000
  });
  return signedUrl;
}

async function uploadFileToGcs(orgId, file) {
  const sanitized = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
  const blobName = `${orgId}/${Date.now()}_${sanitized}`;
  const blob = bucket.file(blobName);

  await blob.save(file.buffer, { contentType: file.mimetype });

  return `https://storage.googleapis.com/${env.gcsBucket}/${blobName}`;
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
