import app from './app';
import { env } from './config/env';
import { connectDB } from './config/db';
import { initCronJobs } from './services/cron.service';
import { logger } from './utils/logger';
import dns from 'dns';

// Set DNS servers for the process (fixes SRV resolution issues on some networks)
dns.setServers(['1.1.1.1', '8.8.8.8']);

const startServer = async () => {
  try {
    // 1. Connect to Database
    await connectDB();

    // 2. Initialize Cron Jobs
    initCronJobs();

    // 3. Start Listening
    const server = app.listen(env.PORT, () => {
      console.log(`\n🚀 Server ready at: http://localhost:${env.PORT}\n`);
    });

    // Handle Graceful Shutdown
    const shutdown = async () => {
      logger.info('🛑 Shutting down gracefully...');
      server.close(() => {
        logger.info('🔌 Server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    logger.error('💥 Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
