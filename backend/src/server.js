import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import './models/index.js';
import app from './app.js';

const start = async () => {
  await connectDB();
  app.listen(env.port, () => {
    console.log(`OpsDesk AI API listening on port ${env.port}`);
  });
};

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
