import app from './app';
import { env } from './config/env';
import { closeDatabasePool } from './lib/db';
import { logger } from './lib/logger';

function startServer() {
  const server = app.listen(env.PORT, () => {
    logger.info('TrainSmart backend listening', {
      port: env.PORT,
      environment: env.NODE_ENV,
    });
  });

  const shutdown = async (signal: string) => {
    logger.info('Shutdown signal received', { signal });
    server.close(async () => {
      await closeDatabasePool();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
}

if (require.main === module) {
  startServer();
}

export default app;
