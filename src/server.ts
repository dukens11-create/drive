import { createApp } from './app';
import { env } from './config';
import { getErrorDetails, logger } from './utils';
import { startJobRunner, stopJobRunner } from './jobs';

type ExitFn = (code: number) => never;

function shutdownServer(exit: ExitFn, close?: (callback: (error?: Error | null) => void) => void) {
  if (!close) {
    return exit(1);
  }

  close(error => {
    if (error) {
      logger.error('http server shutdown failed', getErrorDetails(error));
    }
    exit(1);
  });
}

logger.info('server startup initiated');

let isListening = false;
let closeServer: ((callback: (error?: Error | null) => void) => void) | undefined;
const exitProcess = process.exit.bind(process) as ExitFn;

process.on('uncaughtException', (error) => {
  logger.error('uncaught exception', {
    ...getErrorDetails(error),
    isListening
  });
  shutdownServer(exitProcess, closeServer);
});

process.on('unhandledRejection', (reason) => {
  const details = {
    ...getErrorDetails(reason),
    isListening
  };
  const hasStartupBegun = isListening || Boolean(closeServer);

  if (hasStartupBegun) {
    logger.warn('unhandled rejection after startup; keeping server alive', details);
    return;
  }

  logger.error('unhandled rejection during startup', details);
  shutdownServer(exitProcess, closeServer);
});

try {
  const { httpServer } = createApp();
  const host = env.host;
  logger.info(`Starting listen on ${host}:${env.port}`);
  closeServer = httpServer.close.bind(httpServer);

  const server = httpServer.listen(env.port, host, () => {
    isListening = true;
    startJobRunner();
    logger.info('http server started', {
      host,
      port: env.port,
      nodeEnv: env.nodeEnv,
      dataStoreMode: env.dataStoreMode,
      dataStoreFile: env.dataStoreMode === 'file' ? env.dataStoreFile : null,
      loadedEnvFilePath: env.loadedEnvFilePath ?? null,
      loadedEnvFileSource: env.loadedEnvFileSource
    });
  });

  server.on('listening', () => {
    isListening = true;
    const addr = server.address();
    const addressDetails = typeof addr === 'string'
      ? { address: addr }
      : { address: addr?.address, family: addr?.family, port: addr?.port };
    logger.info('http server listening', {
      ...addressDetails
    });
  });

  server.on('close', () => {
    stopJobRunner();
    isListening = false;
  });

  server.on('error', (error: unknown) => {
    logger.error('http server error', {
      ...getErrorDetails(error),
      host,
      port: env.port
    });
    shutdownServer(exitProcess, closeServer);
  });

  server.on('clientError', (error, socket) => {
    logger.warn('http client error', {
      ...getErrorDetails(error)
    });
    if (socket.writable) {
      socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
    }
  });

  logger.info('server startup completed');
} catch (err) {
  logger.error('server startup failed', {
    ...getErrorDetails(err),
    port: env.port,
    nodeEnv: env.nodeEnv,
    loadedEnvFilePath: env.loadedEnvFilePath ?? null
  });
  exitProcess(1);
}
