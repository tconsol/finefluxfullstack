const { ApiError } = require('../middleware/errorHandler');
const { bucket } = require('../config/gcs');
const env = require('../config/env');

function blobPathFromUrl(fileUrl) {
  const prefix = `https://storage.googleapis.com/${env.gcsBucket}/`;
  if (!fileUrl.startsWith(prefix)) throw new ApiError(400, 'Unrecognized file URL');
  return fileUrl.slice(prefix.length);
}

async function generateSignedUrl(fileUrl, durationSeconds = 60) {
  const blobPath = blobPathFromUrl(fileUrl);
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

module.exports = { blobPathFromUrl, generateSignedUrl, uploadFileToGcs };
