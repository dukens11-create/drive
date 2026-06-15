import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { checkSuspension } from './suspension.middleware';

export function requireAuth(req: any, res: any, next: any) {
  const header = req.headers.authorization;
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) {
    console.warn('[AUTH] Missing Authorization header');
    return res.status(401).json({
      error: 'Missing token',
      errorCode: 'AUTH_TOKEN_MISSING',
      message: 'Provide a valid Authorization header'
    });
  }
  try {
    const token = header.slice('Bearer '.length).trim();
    console.log('[AUTH] Backend verifying token', { tokenLength: token.length });
    const payload = jwt.verify(token, env.jwtSecret, {
      issuer: 'flupflap-ride-api',
      audience: 'flupflap-ride-clients'
    }) as any;

    if (!payload || typeof payload !== 'object' || typeof payload.sub !== 'string' || typeof payload.role !== 'string') {
      return res.status(401).json({
        error: 'Invalid token',
        errorCode: 'AUTH_TOKEN_INVALID',
        message: 'Access token is malformed or expired'
      });
    }

    req.user = { id: payload.sub, role: payload.role, email: payload.email, phone: payload.phone };
    console.log('[AUTH] Backend auth decoded user', req.user);
    checkSuspension(req, res, next);
  } catch (error) {
    console.warn('[AUTH] Backend token verification failed', {
      message: error instanceof Error ? error.message : 'unknown error'
    });
    res.status(401).json({
      error: 'Invalid token',
      errorCode: 'AUTH_TOKEN_INVALID',
      message: 'Access token is malformed or expired'
    });
  }
}

export function requireRole(...roles: string[]) {
  return (req: any, res: any, next: any) => {
    if (!roles.includes(req.user?.role)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}
