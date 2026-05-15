import jwt from 'jsonwebtoken';
import { env } from './env';
import { store } from './data.store';

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

    const user = store.users.get(payload.sub);
    if (!user) return res.status(401).json({ error: 'Invalid token' });
    if (payload.role !== user.role) return res.status(403).json({ error: 'Role changed, please sign in again' });
    if (user.deletedAt) return res.status(403).json({ error: 'Account unavailable' });
    if (user.suspended) return res.status(403).json({ error: 'Account suspended' });

    req.user = { id: payload.sub, role: user.role, email: user.email, phone: user.phone };
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
