import { store } from '../database/data.store';

function sanitizeMessageReason(reason: unknown) {
  if (typeof reason !== 'string') return '';
  return reason.replace(/[\r\n\t]+/g, ' ').trim().slice(0, 255);
}

function hasExpiredSuspension(user: any) {
  if (!user?.suspendExpiresAt) return false;
  const expiresAt = new Date(user.suspendExpiresAt).getTime();
  return Number.isFinite(expiresAt) && expiresAt <= Date.now();
}

export function clearExpiredSuspension(user: any) {
  if (!user || !user.suspended || !hasExpiredSuspension(user)) return false;
  user.suspended = false;
  user.suspendReason = undefined;
  user.suspendExpiresAt = undefined;
  user.suspendedAt = undefined;
  user.suspendedBy = undefined;
  store.users.set(user.id, user);
  return true;
}

export function getActiveSuspension(user: any) {
  if (!user?.suspended) return null;
  if (clearExpiredSuspension(user)) return null;
  return {
    module: 'auth',
    error: 'account_suspended',
    message: sanitizeMessageReason(user.suspendReason)
      ? `Your account has been suspended. Reason: ${sanitizeMessageReason(user.suspendReason)}`
      : 'Your account has been suspended.',
    suspendedAt: user.suspendedAt,
    expiresAt: user.suspendExpiresAt,
    supportEmail: 'support@drive.app'
  };
}

export function checkSuspension(req: any, res: any, next: any) {
  const userId = req.user?.id;
  if (!userId) return next();
  const dbUser = store.users.get(userId);
  const suspension = getActiveSuspension(dbUser);
  if (suspension) {
    return res.status(403).json(suspension);
  }
  next();
}
