/**
 * Two-factor authentication (TOTP-compatible) service.
 * Uses HMAC-SHA1 with time-based one-time passwords (RFC 6238).
 * Compatible with Google Authenticator, Authy, etc.
 */
import { createHmac, randomBytes, randomInt } from 'crypto';
import { appendAuditLog, makeId, markStoreDirty, store, timestamp, type TotpEntry } from '../database/data.store';
import { sendSmsOtp } from './notifications.service';

// ─── Base32 encoding (RFC 4648) ───────────────────────────────────────────────

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buffer: Buffer): string {
  let result = '';
  let bits = 0;
  let value = 0;
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      result += BASE32_CHARS[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) result += BASE32_CHARS[(value << (5 - bits)) & 31];
  return result;
}

function base32Decode(str: string): Buffer {
  const cleanStr = str.toUpperCase().replace(/[^A-Z2-7]/g, '');
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;
  for (const char of cleanStr) {
    const idx = BASE32_CHARS.indexOf(char);
    if (idx < 0) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

// ─── TOTP generation/validation ───────────────────────────────────────────────

function generateTotp(secret: string, window = 0): string {
  const key = base32Decode(secret);
  const counter = Math.floor(Date.now() / 1000 / 30) + window;
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac('sha1', key).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = (
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  ) % 1000000;
  return code.toString().padStart(6, '0');
}

function verifyTotp(secret: string, token: string): boolean {
  const cleanToken = token.replace(/\s/g, '');
  // Allow ±1 window (30 seconds grace)
  for (const window of [-1, 0, 1]) {
    if (generateTotp(secret, window) === cleanToken) return true;
  }
  return false;
}

function generateSecret(): string {
  return base32Encode(randomBytes(20));
}

function generateBackupCodes(): string[] {
  return Array.from({ length: 8 }, () => randomBytes(4).toString('hex').toUpperCase());
}

// ─── Service functions ────────────────────────────────────────────────────────

export async function setupTotp(body: any) {
  const userId = body?.actor?.id || body?.userId;
  if (!userId) return { module: '2fa', action: 'setup', error: 'userId required' };

  const user = store.users.get(userId);
  if (!user) return { module: '2fa', action: 'setup', error: 'user not found' };

  const existing = store.totpEntries.get(userId);
  if (existing?.enabled) {
    return { module: '2fa', action: 'setup', error: '2FA is already enabled' };
  }

  const secret = generateSecret();
  const backupCodes = generateBackupCodes();

  const entry: TotpEntry = {
    userId,
    secret,
    enabled: false,
    backupCodes,
    createdAt: timestamp()
  };

  store.totpEntries.set(userId, entry);
  markStoreDirty();
  appendAuditLog(userId, body?.actor?.role || user.role, 'auth_2fa_setup_started', userId, 'user');

  const issuer = 'Drive';
  const account = user.email || user.phone || userId;
  const otpauthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

  return {
    module: '2fa',
    action: 'setup',
    ok: true,
    secret,
    otpauthUrl,
    qrCodeUrl: otpauthUrl,
    backupCodes,
    message: 'Scan the QR code or enter the secret in your authenticator app, then verify with a token to activate 2FA.'
  };
}

export async function verifyAndEnableTotp(body: any) {
  const userId = body?.actor?.id || body?.userId;
  const token = body?.token;

  if (!userId) return { module: '2fa', action: 'verify', error: 'userId required' };
  if (!token) return { module: '2fa', action: 'verify', error: 'token required' };

  const entry = store.totpEntries.get(userId);
  if (!entry) return { module: '2fa', action: 'verify', error: '2FA not set up' };
  if (entry.enabled) return { module: '2fa', action: 'verify', error: '2FA already enabled' };

  if (!verifyTotp(entry.secret, token)) {
    return { module: '2fa', action: 'verify', error: 'invalid token' };
  }

  entry.enabled = true;
  entry.verifiedAt = timestamp();
  store.totpEntries.set(userId, entry);
  markStoreDirty();
  appendAuditLog(userId, body?.actor?.role || store.users.get(userId)?.role || 'rider', 'auth_2fa_enabled', userId, 'user');

  return { module: '2fa', action: 'verify', ok: true, message: '2FA enabled successfully', backupCodes: entry.backupCodes };
}

export async function disableTotp(body: any) {
  const userId = body?.actor?.id || body?.userId;
  const token = body?.token;

  if (!userId) return { module: '2fa', action: 'disable', error: 'userId required' };
  if (!token) return { module: '2fa', action: 'disable', error: 'token or backup code required' };

  const entry = store.totpEntries.get(userId);
  if (!entry || !entry.enabled) return { module: '2fa', action: 'disable', error: '2FA is not enabled' };

  const validTotp = verifyTotp(entry.secret, token);
  const validBackup = entry.backupCodes.includes(token.toUpperCase().replace(/\s/g, ''));

  if (!validTotp && !validBackup) {
    return { module: '2fa', action: 'disable', error: 'invalid token' };
  }

  store.totpEntries.delete(userId);
  markStoreDirty();
  appendAuditLog(userId, body?.actor?.role || store.users.get(userId)?.role || 'rider', 'auth_2fa_disabled', userId, 'user');

  return { module: '2fa', action: 'disable', ok: true, message: '2FA disabled' };
}

export async function validateTotpToken(body: any) {
  const userId = body?.actor?.id || body?.userId;
  const token = body?.token;

  if (!userId || !token) return { module: '2fa', action: 'validate', error: 'userId and token required' };

  const entry = store.totpEntries.get(userId);
  if (!entry || !entry.enabled) {
    // If 2FA is not set up, validation passes (not required)
    return { module: '2fa', action: 'validate', ok: true, required: false };
  }

  const validTotp = verifyTotp(entry.secret, token);
  if (validTotp) {
    appendAuditLog(userId, body?.actor?.role || store.users.get(userId)?.role || 'rider', 'auth_2fa_validated', userId, 'user', {
      method: 'totp'
    });
    return { module: '2fa', action: 'validate', ok: true, required: true };
  }

  // Check backup codes
  const backupIdx = entry.backupCodes.indexOf(token.toUpperCase().replace(/\s/g, ''));
  if (backupIdx >= 0) {
    entry.backupCodes.splice(backupIdx, 1); // one-time use
    store.totpEntries.set(userId, entry);
    markStoreDirty();
    appendAuditLog(userId, body?.actor?.role || store.users.get(userId)?.role || 'rider', 'auth_2fa_validated', userId, 'user', {
      method: 'backup_code'
    });
    return { module: '2fa', action: 'validate', ok: true, required: true, usedBackupCode: true };
  }

  return { module: '2fa', action: 'validate', ok: false, required: true, error: 'invalid token' };
}

export async function getTotpStatus(body: any) {
  const userId = body?.actor?.id || body?.userId;
  if (!userId) return { module: '2fa', action: 'status', error: 'userId required' };

  const entry = store.totpEntries.get(userId);
  return {
    module: '2fa',
    ok: true,
    status: {
      enabled: entry?.enabled || false,
      setupPending: !!entry && !entry.enabled,
      verifiedAt: entry?.verifiedAt,
      backupCodesRemaining: entry?.backupCodes.length || 0
    }
  };
}

// ─── SMS OTP (for phone-based 2FA) ───────────────────────────────────────────

const smsOtpStore = new Map<string, { otp: string; expiresAt: number }>();
const smsOtpRateLimit = new Map<string, { count: number; windowStart: number }>();
const SMS_OTP_MAX_PER_WINDOW = 3;
const SMS_OTP_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

export async function sendSmsOtpCode(body: any) {
  const phone = body?.phone;
  if (!phone) return { module: '2fa', action: 'sms-otp', error: 'phone required' };

  // Rate limiting: max 3 OTP requests per 10-minute window per phone number
  const now = Date.now();
  const rl = smsOtpRateLimit.get(phone);
  if (rl && now - rl.windowStart < SMS_OTP_WINDOW_MS) {
    if (rl.count >= SMS_OTP_MAX_PER_WINDOW) {
      return { module: '2fa', action: 'sms-otp', error: 'too many OTP requests, please wait before trying again' };
    }
    rl.count++;
  } else {
    smsOtpRateLimit.set(phone, { count: 1, windowStart: now });
  }

  // Use cryptographically secure random number for OTP
  const otp = randomInt(100000, 1000000).toString();
  smsOtpStore.set(phone, { otp, expiresAt: now + SMS_OTP_WINDOW_MS });

  await sendSmsOtp(phone, otp);

  return { module: '2fa', action: 'sms-otp', ok: true, message: 'OTP sent to phone' };
}

export async function verifySmsOtpCode(body: any) {
  const phone = body?.phone;
  const otp = body?.otp;

  if (!phone || !otp) return { module: '2fa', action: 'verify-sms-otp', error: 'phone and otp required' };

  const entry = smsOtpStore.get(phone);
  if (!entry) return { module: '2fa', action: 'verify-sms-otp', error: 'no OTP found for this phone' };
  if (Date.now() > entry.expiresAt) {
    smsOtpStore.delete(phone);
    return { module: '2fa', action: 'verify-sms-otp', error: 'OTP expired' };
  }
  if (entry.otp !== otp) {
    return { module: '2fa', action: 'verify-sms-otp', error: 'invalid OTP' };
  }

  smsOtpStore.delete(phone);
  return { module: '2fa', action: 'verify-sms-otp', ok: true };
}
