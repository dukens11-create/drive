import { createApp } from './app';
import { env } from './config';
import { logger } from './utils';

const { httpServer } = createApp();

httpServer.listen(env.port, '0.0.0.0', () => {
  logger.info('http server started', {
    port: env.port,
    nodeEnv: env.nodeEnv,
    dataStoreMode: env.dataStoreMode
  });
});
