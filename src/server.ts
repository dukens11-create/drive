import { createApp } from './app';
import { env } from './config';
import { logger } from './utils';

console.log('🔍 [START] Creating app...');

try {
  const { httpServer } = createApp();
  console.log('🔍 [APP CREATED] Starting listen on 0.0.0.0:' + env.port);

  const server = httpServer.listen(env.port, '0.0.0.0', () => {
    console.log('🔍 [CALLBACK] Listen callback fired');
    logger.info('http server started', {
      port: env.port,
      nodeEnv: env.nodeEnv,
      dataStoreMode: env.dataStoreMode
    });
  });

  server.on('listening', () => {
    const addr = server.address();
    console.log('🔍 [LISTENING EVENT] Server is listening:', addr);
  });

  server.on('error', (err: any) => {
    console.error('🔍 [ERROR EVENT]', err);
    process.exit(1);
  });

  process.on('uncaughtException', (err) => {
    console.error('🔍 [UNCAUGHT EXCEPTION]', err);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    console.error('🔍 [UNHANDLED REJECTION]', reason);
    process.exit(1);
  });

  console.log('🔍 [READY] Server initialization complete');
} catch (err) {
  console.error('🔍 [FATAL ERROR] During startup:', err);
  process.exit(1);
}
