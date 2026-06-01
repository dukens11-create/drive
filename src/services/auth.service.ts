import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import jwt from 'jsonwebtoken';
import {
  appendAuditLog,
  makeId,
  store,
  timestamp,
  type DriverProfile,
  type RiderProfile,
  type RefreshTokenSession,
  type Role
} from '../database/data.store';
import { env } from '../config/env';
import { validateTotpToken } from './twofa.service';

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

function inferDeviceName(userAgent?: string) {
  const source = (userAgent || '').toLowerCase();
  if (!source) return 'unknown device';
  if (source.includes('iphone')) return 'iPhone';
  if (source.includes('ipad')) return 'iPad';
  if (source.includes('android')) return 'Android device';
  if (source.includes('windows')) return 'Windows device';
  if (source.includes('mac os') || source.includes('macintosh')) return 'Mac device';
  if (source.includes('linux')) return 'Linux device';
  return (userAgent || 'unknown device').slice(0, 80);
}

function issueRefreshToken(userId: string, sessionContext: Partial<RefreshTokenSession> = {}) {
  const refreshToken = randomBytes(48).toString('hex');
  const tokenHash = hashRefreshToken(refreshToken);
  const now = timestamp();
  const session: RefreshTokenSession = {
    userId,
    sessionId: sessionContext.sessionId || makeId('session'),
    createdAt: sessionContext.createdAt || now,
    lastUsedAt: now,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
    ipAddress: sessionContext.ipAddress,
    userAgent: sessionContext.userAgent,
    deviceName: sessionContext.deviceName || inferDeviceName(sessionContext.userAgent)
  };
  store.refreshTokens.set(tokenHash, session);
  return { refreshToken, session };
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

function createDefaultDriverProfile(userId: string): DriverProfile {
  return {
    userId,
    status: 'pending',
    verificationState: 'documents_pending',
    availabilityStatus: 'offline',
    available: false,
    rating: 5,
    acceptanceRate: 1,
    cancellationRate: 0,
    earningsCents: 0,
    documents: [],
    verificationDocuments: [],
    selfieVerification: {
      status: 'missing',
      score: 0
    },
    verificationReview: {
      status: 'pending_review'
    }
  };
}

function createDefaultRiderProfile(userId: string): RiderProfile {
  return {
    userId,
    favoriteLocations: [],
    rating: 5,
    reviewCount: 0
  };
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
  if (role === 'driver') {
    store.drivers.set(user.id, createDefaultDriverProfile(user.id));
  } else if (role === 'rider') {
    store.riders.set(user.id, createDefaultRiderProfile(user.id));
  }

  const accessToken = signAccessToken(user);
  const { refreshToken, session } = issueRefreshToken(user.id, {
    ipAddress: body?.ipAddress,
    userAgent: body?.userAgent
  });
  appendAuditLog(user.id, user.role, 'auth_signup', user.id, 'user', {
    sessionId: session.sessionId,
    ipAddress: body?.ipAddress,
    userAgent: body?.userAgent
  });

  return { module: 'auth', action: 'signup', ok: true, user: sanitizeUser(user), accessToken, refreshToken };
}

export async function login(body: any, _params?: any, _query?: any) {
  const email = body?.email?.toLowerCase?.();
  const phone = body?.phone;
  const password = body?.password;

  const user = Array.from(store.users.values()).find(u => (email && u.email === email) || (phone && u.phone === phone));
  if (!user || !verifyPassword(password || '', user.password)) {
    appendAuditLog('anonymous', 'anonymous', 'auth_login_failed', user?.id || email || phone, user ? 'user' : 'identifier', {
      reason: 'invalid_credentials',
      ipAddress: body?.ipAddress,
      userAgent: body?.userAgent
    });
    return { module: 'auth', action: 'login', error: 'invalid credentials' };
  }

  const twoFactorState = store.totpEntries.get(user.id);
  if (twoFactorState?.enabled) {
    if (!body?.otpToken) {
      appendAuditLog(user.id, user.role, 'auth_login_failed', user.id, 'user', {
        reason: 'missing_2fa_token',
        ipAddress: body?.ipAddress,
        userAgent: body?.userAgent
      });
      return { module: 'auth', action: 'login', error: '2FA token required' };
    }

    const secondFactorResult = await validateTotpToken({ userId: user.id, token: body.otpToken });
    if (!secondFactorResult.ok) {
      appendAuditLog(user.id, user.role, 'auth_login_failed', user.id, 'user', {
        reason: 'invalid_2fa_token',
        ipAddress: body?.ipAddress,
        userAgent: body?.userAgent
      });
      return { module: 'auth', action: 'login', error: 'invalid 2FA token' };
    }
  }

  const accessToken = signAccessToken(user);
  const { refreshToken, session } = issueRefreshToken(user.id, {
    ipAddress: body?.ipAddress,
    userAgent: body?.userAgent
  });
  appendAuditLog(user.id, user.role, 'auth_login_succeeded', user.id, 'user', {
    sessionId: session.sessionId,
    ipAddress: body?.ipAddress,
    userAgent: body?.userAgent,
    secondFactorUsed: !!twoFactorState?.enabled
  });

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
  const { refreshToken: nextRefreshToken, session: nextSession } = issueRefreshToken(user.id, {
    sessionId: session.sessionId,
    createdAt: session.createdAt,
    ipAddress: body?.ipAddress || session.ipAddress,
    userAgent: body?.userAgent || session.userAgent,
    deviceName: session.deviceName
  });
  appendAuditLog(user.id, user.role, 'auth_refresh', user.id, 'user', {
    sessionId: nextSession.sessionId,
    ipAddress: body?.ipAddress || session.ipAddress,
    userAgent: body?.userAgent || session.userAgent
  });
  return { module: 'auth', action: 'refresh', ok: true, accessToken, refreshToken: nextRefreshToken };
}

export async function logout(body: any, _params?: any, _query?: any) {
  const refreshToken = body?.refreshToken;
  if (!refreshToken) return { module: 'auth', action: 'logout', error: 'refreshToken is required' };
  const tokenHash = hashRefreshToken(refreshToken);
  const session = store.refreshTokens.get(tokenHash);
  const deleted = store.refreshTokens.delete(tokenHash);
  if (deleted && session) {
    const user = store.users.get(session.userId);
    appendAuditLog(session.userId, user?.role || 'rider', 'auth_logout', session.userId, 'user', {
      sessionId: session.sessionId,
      ipAddress: body?.ipAddress || session.ipAddress,
      userAgent: body?.userAgent || session.userAgent
    });
  }
  return { module: 'auth', action: 'logout', ok: true, revoked: deleted };
}

export async function listSessions(body: any, _params?: any, _query?: any) {
  const userId = body?.actor?.id;
  if (!userId) return { module: 'auth', action: 'sessions', error: 'userId required' };

  const sessions = Array.from(store.refreshTokens.values())
    .filter(session => session.userId === userId && new Date(session.expiresAt).getTime() > Date.now())
    .sort((a, b) => b.lastUsedAt.localeCompare(a.lastUsedAt));

  return { module: 'auth', action: 'sessions', ok: true, sessions };
}

export async function loginHistory(body: any, _params?: any, _query?: any) {
  const userId = body?.actor?.id;
  if (!userId) return { module: 'auth', action: 'login-history', error: 'userId required' };

  const actions = new Set([
    'auth_signup',
    'auth_login_failed',
    'auth_login_succeeded',
    'auth_refresh',
    'auth_logout',
    'auth_session_revoked',
    'auth_2fa_setup_started',
    'auth_2fa_enabled',
    'auth_2fa_disabled',
    'auth_2fa_validated'
  ]);

  const entries = store.auditLogs
    .filter(log => actions.has(log.action) && (log.actorId === userId || log.targetId === userId))
    .slice(-50)
    .reverse();

  return { module: 'auth', action: 'login-history', ok: true, entries };
}

export async function revokeSession(body: any, _params?: any, _query?: any) {
  const userId = body?.actor?.id;
  const sessionId = body?.sessionId;
  if (!userId) return { module: 'auth', action: 'revoke-session', error: 'userId required' };
  if (!sessionId) return { module: 'auth', action: 'revoke-session', error: 'sessionId is required' };

  let revoked = false;
  for (const [tokenHash, session] of store.refreshTokens.entries()) {
    if (session.userId === userId && session.sessionId === sessionId) {
      revoked = store.refreshTokens.delete(tokenHash) || revoked;
    }
  }

  if (revoked) {
    appendAuditLog(userId, body.actor.role, 'auth_session_revoked', userId, 'user', { sessionId });
  }

  return { module: 'auth', action: 'revoke-session', ok: true, revoked, sessionId };
}
