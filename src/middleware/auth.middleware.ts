import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export function requireAuth(req: any, res: any, next: any) {
  const header = req.headers.authorization;
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' });
  try {
    const token = header.slice('Bearer '.length).trim();
    const payload = jwt.verify(token, env.jwtSecret, {
      issuer: 'flupflap-ride-api',
      audience: 'flupflap-ride-clients'
    }) as any;

    if (!payload || typeof payload !== 'object' || typeof payload.sub !== 'string' || typeof payload.role !== 'string') {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = { id: payload.sub, role: payload.role, email: payload.email, phone: payload.phone };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: any, res: any, next: any) => {
    if (!roles.includes(req.user?.role)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}
