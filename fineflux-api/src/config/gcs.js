const { Storage } = require('@google-cloud/storage');
const env = require('./env');

const storage = new Storage({
  projectId: env.gcsProjectId,
  keyFilename: env.gcsKeyFile
});

const bucket = storage.bucket(env.gcsBucket);

module.exports = { storage, bucket };
