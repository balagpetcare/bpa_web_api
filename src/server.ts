import 'dotenv/config';

import { config } from './config';
import app from './app';
import { prisma } from './database/prisma';
import { startCampaignCleanupJob } from './jobs/campaign-cleanup.job';

async function bootstrap(): Promise<void> {
  await prisma.$connect();
  console.log('Database connection established');

  const cleanupTimer = startCampaignCleanupJob();

  const server = app.listen(config.PORT, () => {
    console.log(`BPA API running on port ${config.PORT} [${config.NODE_ENV}]`);
    // Signal PM2 that this worker is ready to receive traffic (cluster mode).
    // Optional chaining prevents a crash when running outside PM2 (tests, Docker).
    process.send?.('ready');
  });

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\nReceived ${signal}. Shutting down gracefully...`);
    clearInterval(cleanupTimer);
    server.close(async () => {
      await prisma.$disconnect();
      console.log('Database disconnected');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
