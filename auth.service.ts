import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import jwt from 'jsonwebtoken';
import { makeId, store, timestamp, type Role } from './data.store';
import { env } from './env';

function signAccessToken(user: { id: string; role: string; email?: string; phone?: string }) {
  return jwt.sign({ sub: user.id, role: user.role, email: user.email, phone: user.phone }, env.jwtSecret, {
    expiresIn: '1h',
    issuer: 'flupflap-ride-api',
    audience: 'flupflap-ride-clients'
  });
}

function hashRefreshToken(refreshToken: string) {
  return createHash('sha256').update(`${refreshToken}:${env.jwtSecret}`).digest('hex');
}

function issueRefreshToken(userId: string) {
  const refreshToken = randomBytes(48).toString('hex');
  const tokenHash = hashRefreshToken(refreshToken);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
  store.refreshTokens.set(tokenHash, { userId, expiresAt });
  return refreshToken;
}

function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

function verifyPassword(inputPassword: string, storedPassword: string) {
  if (storedPassword.startsWith('scrypt$')) {
    const [, saltHex, hashHex] = storedPassword.split('$');
    const inputHash = scryptSync(inputPassword, Buffer.from(saltHex, 'hex'), 64);
    const storedHash = Buffer.from(hashHex, 'hex');
    return timingSafeEqual(inputHash, storedHash);
  }

  const input = Buffer.from(inputPassword);
  const stored = Buffer.from(storedPassword);
  if (input.length !== stored.length) return false;
  return timingSafeEqual(input, stored);
}

function sanitizeUser(user: any) {
  const { password, ...safe } = user;
  return safe;
}

function normalizeRole(role: any): Role {
  return role === 'driver' || role === 'merchant' ? role : 'rider';
}

export async function signup(body: any, _params?: any, _query?: any) {
  const email = body?.email?.toLowerCase?.();
  const phone = body?.phone;
  const password = body?.password;
  const role: Role = normalizeRole(body?.role);

  if ((!email && !phone) || !password) {
    return { module: 'auth', action: 'signup', error: 'email or phone and password are required' };
  }

  const existing = Array.from(store.users.values()).find(u => (email && u.email === email) || (phone && u.phone === phone));
  if (existing) return { module: 'auth', action: 'signup', error: 'user already exists' };

  const user = { id: makeId('user'), email, phone, password: hashPassword(password), role, createdAt: timestamp() };
  store.users.set(user.id, user);

  const accessToken = signAccessToken(user);
  const refreshToken = issueRefreshToken(user.id);

  return { module: 'auth', action: 'signup', ok: true, user: sanitizeUser(user), accessToken, refreshToken };
}

export async function login(body: any, _params?: any, _query?: any) {
  const email = body?.email?.toLowerCase?.();
  const phone = body?.phone;
  const password = body?.password;

  const user = Array.from(store.users.values()).find(u => (email && u.email === email) || (phone && u.phone === phone));
  if (!user || !verifyPassword(password || '', user.password)) {
    return { module: 'auth', action: 'login', error: 'invalid credentials' };
  }

  const accessToken = signAccessToken(user);
  const refreshToken = issueRefreshToken(user.id);

  return { module: 'auth', action: 'login', ok: true, user: sanitizeUser(user), accessToken, refreshToken };
}

export async function refresh(body: any, _params?: any, _query?: any) {
  const refreshToken = body?.refreshToken;
  if (!refreshToken) return { module: 'auth', action: 'refresh', error: 'refreshToken is required' };

  const tokenHash = hashRefreshToken(refreshToken);
  const session = store.refreshTokens.get(tokenHash);
  if (!session) return { module: 'auth', action: 'refresh', error: 'invalid refresh token' };
  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    store.refreshTokens.delete(tokenHash);
    return { module: 'auth', action: 'refresh', error: 'refresh token expired' };
  }

  const user = store.users.get(session.userId);
  if (!user) return { module: 'auth', action: 'refresh', error: 'user not found' };

  store.refreshTokens.delete(tokenHash);
  const accessToken = signAccessToken(user);
  const nextRefreshToken = issueRefreshToken(user.id);
  return { module: 'auth', action: 'refresh', ok: true, accessToken, refreshToken: nextRefreshToken };
}

export async function logout(body: any, _params?: any, _query?: any) {
  const refreshToken = body?.refreshToken;
  if (!refreshToken) return { module: 'auth', action: 'logout', error: 'refreshToken is required' };
  const tokenHash = hashRefreshToken(refreshToken);
  const deleted = store.refreshTokens.delete(tokenHash);
  return { module: 'auth', action: 'logout', ok: true, revoked: deleted };
}
