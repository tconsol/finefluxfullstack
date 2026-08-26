const env = require('./config/env');
const { connectDb } = require('./config/db');
const app = require('./app');
const { startReconciliationJob } = require('./jobs/paymentReconciliationJob');

async function start() {
  await connectDb();
  app.listen(env.port, () => {
    console.log(`FineFlux API listening on port ${env.port}`);
  });
  startReconciliationJob();
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
