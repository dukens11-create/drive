import jwt from 'jsonwebtoken';
import { makeId, store, timestamp, type Role } from './data.store';

const jwtSecret = process.env.JWT_SECRET || 'dev';

function signAccessToken(user: { id: string; role: string; email?: string; phone?: string }) {
  return jwt.sign({ sub: user.id, role: user.role, email: user.email, phone: user.phone }, jwtSecret, { expiresIn: '1h' });
}

function sanitizeUser(user: any) {
  const { password, ...safe } = user;
  return safe;
}

export async function signup(body: any, _params?: any, _query?: any) {
  const email = body?.email?.toLowerCase?.();
  const phone = body?.phone;
  const password = body?.password;
  const role: Role = body?.role || 'rider';

  if ((!email && !phone) || !password) {
    return { module: 'auth', action: 'signup', error: 'email or phone and password are required' };
  }

  const existing = Array.from(store.users.values()).find(u => (email && u.email === email) || (phone && u.phone === phone));
  if (existing) return { module: 'auth', action: 'signup', error: 'user already exists' };

  const user = { id: makeId('user'), email, phone, password, role, createdAt: timestamp() };
  store.users.set(user.id, user);

  const accessToken = signAccessToken(user);
  const refreshToken = makeId('refresh');
  store.refreshTokens.set(refreshToken, user.id);

  return { module: 'auth', action: 'signup', ok: true, user: sanitizeUser(user), accessToken, refreshToken };
}

export async function login(body: any, _params?: any, _query?: any) {
  const email = body?.email?.toLowerCase?.();
  const phone = body?.phone;
  const password = body?.password;

  const user = Array.from(store.users.values()).find(u => ((email && u.email === email) || (phone && u.phone === phone)) && u.password === password);
  if (!user) return { module: 'auth', action: 'login', error: 'invalid credentials' };

  const accessToken = signAccessToken(user);
  const refreshToken = makeId('refresh');
  store.refreshTokens.set(refreshToken, user.id);

  return { module: 'auth', action: 'login', ok: true, user: sanitizeUser(user), accessToken, refreshToken };
}

export async function refresh(body: any, _params?: any, _query?: any) {
  const refreshToken = body?.refreshToken;
  if (!refreshToken) return { module: 'auth', action: 'refresh', error: 'refreshToken is required' };

  const userId = store.refreshTokens.get(refreshToken);
  if (!userId) return { module: 'auth', action: 'refresh', error: 'invalid refresh token' };

  const user = store.users.get(userId);
  if (!user) return { module: 'auth', action: 'refresh', error: 'user not found' };

  const accessToken = signAccessToken(user);
  return { module: 'auth', action: 'refresh', ok: true, accessToken };
}
