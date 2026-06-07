import { createApp } from './app';
import { env } from './config';
import { getErrorDetails, logger } from './utils';

type ExitFn = (code: number) => never;

function shutdownServer(exit: ExitFn, close?: (callback: (error?: Error | null) => void) => void) {
  if (!close) {
    exit(1);
  }

  close(error => {
    if (error) {
      logger.error('http server shutdown failed', getErrorDetails(error));
    }
    exit(1);
  });
}

console.log('🔍 [START] Creating app...');

let isListening = false;
let closeServer: ((callback: (error?: Error | null) => void) => void) | undefined;
const exitProcess = process.exit.bind(process) as ExitFn;

process.on('uncaughtException', (err) => {
  logger.error('uncaught exception', {
    ...getErrorDetails(err),
    isListening
  });
  shutdownServer(exitProcess, closeServer);
});

process.on('unhandledRejection', (reason) => {
  const details = {
    ...getErrorDetails(reason),
    isListening
  };

  if (isListening) {
    logger.warn('unhandled rejection after startup; keeping server alive', details);
    return;
  }

  logger.error('unhandled rejection during startup', details);
  shutdownServer(exitProcess, closeServer);
});

try {
  const { httpServer } = createApp();
  console.log('🔍 [APP CREATED] Starting listen on 0.0.0.0:' + env.port);
  closeServer = httpServer.close.bind(httpServer);

  const server = httpServer.listen(env.port, '0.0.0.0', () => {
    console.log('🔍 [CALLBACK] Listen callback fired');
    logger.info('http server started', {
      port: env.port,
      nodeEnv: env.nodeEnv,
      dataStoreMode: env.dataStoreMode,
      loadedEnvFilePath: env.loadedEnvFilePath ?? null
    });
  });

  server.on('listening', () => {
    isListening = true;
    const addr = server.address();
    console.log('🔍 [LISTENING EVENT] Server is listening:', addr);
    logger.info('http server listening', {
      address: typeof addr === 'string' ? addr : addr?.address,
      family: typeof addr === 'string' ? undefined : addr?.family,
      port: typeof addr === 'string' ? undefined : addr?.port
    });
  });

  server.on('close', () => {
    isListening = false;
  });

  server.on('error', (err: any) => {
    logger.error('http server error', {
      ...getErrorDetails(err),
      port: env.port
    });
    console.error('🔍 [ERROR EVENT]', err);
    shutdownServer(exitProcess, closeServer);
  });

  console.log('🔍 [READY] Server initialization complete');
} catch (err) {
  logger.error('server startup failed', {
    ...getErrorDetails(err),
    port: env.port,
    nodeEnv: env.nodeEnv,
    loadedEnvFilePath: env.loadedEnvFilePath ?? null
  });
  console.error('🔍 [FATAL ERROR] During startup:', err);
  exitProcess(1);
}
