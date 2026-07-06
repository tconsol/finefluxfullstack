const express = require('express');
const multer = require('multer');
const router = express.Router({ mergeParams: true });
const ctrl = require('../controllers/documentController');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

router.get('/', ctrl.list);
router.post('/upload', upload.single('file'), ctrl.upload);
router.get('/:documentId/download-url', ctrl.getDownloadUrl);
router.get('/:documentId/download', ctrl.redirectToSignedUrl);
router.get('/:documentId/stream', ctrl.streamDocumentProxy);
router.get('/:id', ctrl.get);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
