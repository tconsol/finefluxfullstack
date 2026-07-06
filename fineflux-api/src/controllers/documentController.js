const axios = require('axios');
const asyncHandler = require('../utils/asyncHandler');
const svc = require('../services/documentService');
const { ApiError } = require('../middleware/errorHandler');

exports.list = asyncHandler(async (req, res) => res.json(await svc.list(req.params.orgId, req.query)));
exports.get = asyncHandler(async (req, res) => res.json(await svc.get(req.params.orgId, req.params.id)));

exports.getDownloadUrl = asyncHandler(async (req, res) => {
  const url = await svc.generateDownloadUrl(req.params.orgId, req.params.documentId, req.query.durationSeconds);
  res.json({ url });
});

exports.redirectToSignedUrl = asyncHandler(async (req, res) => {
  const url = await svc.generateDownloadUrl(req.params.orgId, req.params.documentId, req.query.durationSeconds || 60);
  res.redirect(302, url);
});

exports.streamDocumentProxy = asyncHandler(async (req, res) => {
  const url = await svc.generateDownloadUrl(req.params.orgId, req.params.documentId, req.query.durationSeconds || 300);
  const upstream = await axios.get(url, { responseType: 'stream' });
  res.setHeader('Content-Type', upstream.headers['content-type'] || 'application/octet-stream');
  upstream.data.pipe(res);
});

exports.upload = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'No file uploaded');
  const fileUrl = await svc.uploadFileToGcs(req.params.orgId, req.file);
  res.status(201).json({ fileUrl });
});

exports.create = asyncHandler(async (req, res) => res.status(201).json(await svc.create(req.params.orgId, req.body)));
exports.update = asyncHandler(async (req, res) => res.json(await svc.update(req.params.orgId, req.params.id, req.body)));
exports.remove = asyncHandler(async (req, res) => {
  await svc.remove(req.params.orgId, req.params.id);
  res.status(204).send();
});
