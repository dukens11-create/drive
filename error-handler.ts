import { logger } from './logger';

export function errorHandler(err: any, _req: any, res: any, _next: any) {
  logger.error('request failed', {
    status: err?.status || 500,
    message: err?.message || 'Internal server error'
  });
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
}
