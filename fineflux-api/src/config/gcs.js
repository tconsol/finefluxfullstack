const { Storage } = require('@google-cloud/storage');
const env = require('./env');

const storage = new Storage({
  projectId: env.gcsProjectId,
  credentials: {
    client_email: env.gcsClientEmail,
    private_key: env.gcsPrivateKey
  }
});

const bucket = storage.bucket(env.gcsBucket);

module.exports = { storage, bucket };
