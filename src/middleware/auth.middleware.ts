import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export function requireAuth(req: any, res: any, next: any) {
  const header = req.headers.authorization;
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) {
    console.warn('[AUTH] Missing or malformed bearer token', { method: req.method, path: req.path });
    return res.status(401).json({ error: 'Missing token' });
  }
  try {
    const token = header.slice('Bearer '.length).trim();
    const payload = jwt.verify(token, env.jwtSecret, {
      issuer: 'flupflap-ride-api',
      audience: 'flupflap-ride-clients'
    }) as any;

    // Support current JWT claim (`sub`) and legacy claim shapes used by older clients.
    const userId = payload?.sub || payload?.userId || payload?.id;
    const role = payload?.role;
    if (!payload || typeof payload !== 'object' || typeof userId !== 'string' || typeof role !== 'string') {
      console.warn('[AUTH] Invalid JWT payload shape', { method: req.method, path: req.path, payloadKeys: Object.keys(payload || {}) });
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = { id: userId, role, email: payload.email, phone: payload.phone };
    next();
  } catch (error) {
    console.warn('[AUTH] JWT verification failed', { method: req.method, path: req.path, error: (error as Error)?.message });
    res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: any, res: any, next: any) => {
    if (!roles.includes(req.user?.role)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}
