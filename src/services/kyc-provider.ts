import { createHmac, timingSafeEqual } from 'crypto';
import { env } from '../config/env';
import {
  makeId,
  store,
  timestamp,
  type KycSelfie,
  type KycSession,
  type KycVerification
} from '../database/data.store';

const KYC_SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000;

function getSessionUrl(providerSessionId: string) {
  return `${env.kycProviderBaseUrl.replace(/\/$/, '')}/session/${providerSessionId}`;
}

function toConfidenceScore(rawValue: unknown, fallback = 0) {
  const numeric = Number(rawValue);
  if (!Number.isFinite(numeric)) return fallback;
  if (numeric > 1) return Math.max(0, Math.min(1, numeric / 100));
  return Math.max(0, Math.min(1, numeric));
}

function getProviderScores(payload: any) {
  const documentScore = toConfidenceScore(
    payload?.verifications?.document?.confidence
    ?? payload?.verifications?.document?.score
    ?? payload?.data?.attributes?.['document-score'],
    0.95
  );
  const selfieScore = toConfidenceScore(
    payload?.verifications?.selfie?.confidence
    ?? payload?.verifications?.selfie?.score
    ?? payload?.data?.attributes?.['selfie-score'],
    0.98
  );
  const databaseScore = payload?.verifications?.database?.match === true
    || payload?.verifications?.database?.status === 'approved'
    ? 1
    : toConfidenceScore(payload?.verifications?.database?.confidence ?? payload?.verifications?.database?.score, 0);
  return [documentScore, selfieScore, databaseScore].filter(score => score > 0);
}

function mapVerificationStatus(payload: any) {
  const explicitStatus = String(
    payload?.status
    ?? payload?.data?.attributes?.status
    ?? payload?.attributes?.status
    ?? payload?.event
    ?? ''
  ).toLowerCase();

  if (explicitStatus.includes('reject') || explicitStatus.includes('declin')) {
    return { verificationStatus: 'rejected' as const, kycStatus: 'rejected' as const };
  }
  if (explicitStatus.includes('pending')) {
    return { verificationStatus: 'pending_review' as const, kycStatus: 'pending' as const };
  }

  const scores = getProviderScores(payload);
  const confidenceScore = scores.length
    ? Number((scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(4))
    : 0;

  if (confidenceScore >= 0.9) {
    return { verificationStatus: 'approved' as const, kycStatus: 'verified' as const, confidenceScore };
  }
  if (confidenceScore < 0.7) {
    return { verificationStatus: 'rejected' as const, kycStatus: 'rejected' as const, confidenceScore };
  }
  return { verificationStatus: 'pending_review' as const, kycStatus: 'pending' as const, confidenceScore };
}

function findSessionForWebhook(payload: any) {
  const directSessionId = String(
    payload?.sessionId
    ?? payload?.inquiry_id
    ?? payload?.data?.id
    ?? payload?.data?.attributes?.['session-id']
    ?? ''
  ).trim();
  if (!directSessionId) return null;
  return Array.from(store.kycSessions.values()).find(session => session.sessionId === directSessionId || session.id === directSessionId) || null;
}

export function verifyKycWebhookSignature(rawBody: string, signature?: string) {
  if (!env.kycProviderWebhookSecret) return env.nodeEnv !== 'production';
  if (!signature) return false;

  for (const group of String(signature).trim().split(/\s+/).filter(Boolean)) {
    const values = Object.fromEntries(group.split(',').map(part => {
      const index = part.indexOf('=');
      return index > 0 ? [part.slice(0, index), part.slice(index + 1)] : [part, ''];
    }));
    const webhookTimestamp = String(values.t || '');
    const provided = String(values.v1 || '');
    const timestampSeconds = Number(webhookTimestamp);
    if (!webhookTimestamp || !provided || !Number.isFinite(timestampSeconds)) continue;
    if (Math.abs(Date.now() / 1000 - timestampSeconds) > 300) continue;

    const expected = createHmac('sha256', env.kycProviderWebhookSecret)
      .update(`${webhookTimestamp}.${rawBody}`)
      .digest('hex');
    const left = Buffer.from(expected, 'utf8');
    const right = Buffer.from(provided, 'utf8');
    if (left.length === right.length && timingSafeEqual(left, right)) return true;
  }
  return false;
}

async function personaRequest(pathname: string, init: RequestInit) {
  const baseUrl = String(env.kycProviderBaseUrl || 'https://api.withpersona.com').replace(/\/+$/, '');
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...init,
    signal: AbortSignal.timeout(15_000),
    headers: {
      Authorization: `Bearer ${env.kycProviderApiKey}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'Persona-Version': '2023-01-05',
      ...(init.headers || {})
    }
  });
  const raw = await response.text();
  let payload: any = {};
  try { payload = raw ? JSON.parse(raw) : {}; } catch { payload = { raw }; }
  if (!response.ok) {
    const detail = payload?.errors?.[0]?.detail || payload?.errors?.[0]?.title || payload?.error || `Persona returned HTTP ${response.status}`;
    throw new Error(String(detail));
  }
  return payload;
}

export async function createKycSession(userId: string, documentType = 'driver_license', country = 'US') {
  const createdAt = timestamp();
  const expiresAt = new Date(Date.now() + KYC_SESSION_EXPIRY_MS).toISOString();
  const personaConfigured = Boolean(env.kycProvider === 'persona' && env.kycProviderApiKey && env.kycTemplateId && env.kycProviderWebhookSecret);

  if (!personaConfigured) {
    if (env.nodeEnv === 'production') {
      throw new Error('Real KYC is required in production. Configure Persona API, template, and webhook credentials.');
    }
    const providerSessionId = makeId('persona_dev');
    const session: KycSession = {
      id: makeId('kyc_session'), userId, provider: `${env.kycProvider}_development`, documentType, country,
      sessionId: providerSessionId, sessionUrl: getSessionUrl(providerSessionId), status: 'pending', createdAt, expiresAt
    };
    store.kycSessions.set(session.id, session);
    store.kycStatus.set(userId, 'pending');
    return session;
  }

  const createPayload = await personaRequest('/api/v1/inquiries', {
    method: 'POST',
    headers: { 'Idempotency-Key': `flupflap-kyc-${userId}` },
    body: JSON.stringify({ data: { attributes: { 'inquiry-template-id': env.kycTemplateId, 'reference-id': userId } } })
  });
  const inquiryId = String(createPayload?.data?.id || '').trim();
  if (!inquiryId.startsWith('inq_')) throw new Error('Persona did not return a valid inquiry ID');

  let oneTimeLink = String(createPayload?.meta?.['one-time-link'] || createPayload?.meta?.oneTimeLink || '').trim();
  if (!oneTimeLink) {
    const linkPayload = await personaRequest(`/api/v1/inquiries/${encodeURIComponent(inquiryId)}/generate-one-time-link`, {
      method: 'POST', headers: { 'Idempotency-Key': `flupflap-kyc-link-${inquiryId}` }, body: JSON.stringify({})
    });
    oneTimeLink = String(linkPayload?.meta?.['one-time-link'] || linkPayload?.meta?.oneTimeLink || '').trim();
  }
  if (!oneTimeLink.startsWith('https://')) throw new Error('Persona did not return a secure inquiry URL');

  const session: KycSession = {
    id: makeId('kyc_session'),
    userId,
    provider: 'persona',
    documentType,
    country,
    sessionId: inquiryId,
    sessionUrl: oneTimeLink,
    status: 'pending',
    createdAt,
    expiresAt
  };
  store.kycSessions.set(session.id, session);
  store.kycStatus.set(userId, 'pending');
  return session;
}

export async function handleKycWebhook(event: any) {
  const payload = event?.data ? event : { ...event, data: event?.data };
  const session = findSessionForWebhook(payload);
  const userId = String(payload?.userId || payload?.data?.attributes?.['user-id'] || session?.userId || '').trim();
  const scores = getProviderScores(payload);
  const fallbackConfidence = scores.length
    ? Number((scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(4))
    : 0;
  const outcome = mapVerificationStatus(payload);
  const confidenceScore = outcome.confidenceScore ?? fallbackConfidence;
  const now = timestamp();

  if (!userId) {
    return {
      handled: false,
      error: 'userId is required'
    };
  }

  const verification: KycVerification = {
    id: makeId('kyc_ver'),
    userId,
    sessionId: session?.id,
    documentType: payload?.attributes?.document_type
      ?? payload?.data?.attributes?.['document-type']
      ?? payload?.data?.attributes?.documentType
      ?? 'driver_license',
    documentNumber: payload?.attributes?.document_number
      ?? payload?.data?.attributes?.['document-number']
      ?? payload?.data?.attributes?.['government-id-number'],
    fullName: payload?.attributes?.name
      ?? payload?.data?.attributes?.name
      ?? payload?.data?.attributes?.['full-name'],
    dateOfBirth: payload?.attributes?.date_of_birth
      ?? payload?.data?.attributes?.['date-of-birth']
      ?? payload?.data?.attributes?.dateOfBirth,
    expiryDate: payload?.attributes?.expiry_date
      ?? payload?.data?.attributes?.['expiration-date']
      ?? payload?.data?.attributes?.expiryDate,
    status: outcome.verificationStatus,
    confidenceScore,
    rejectionReason: payload?.rejectionReason ?? payload?.data?.attributes?.['rejection-reason'],
    verifiedAt: now,
    createdAt: now
  };
  store.kycVerifications.set(verification.id, verification);

  const selfie: KycSelfie = {
    id: makeId('kyc_selfie'),
    userId,
    sessionId: session?.id,
    imageUrl: payload?.selfie?.imageUrl ?? payload?.data?.attributes?.['selfie-image-url'],
    livenessScore: toConfidenceScore(payload?.verifications?.selfie?.confidence ?? payload?.verifications?.selfie?.score, 0),
    matchesDocument: payload?.verifications?.database?.match ?? payload?.verifications?.selfie?.status === 'approved',
    status: outcome.verificationStatus,
    verifiedAt: now,
    createdAt: now
  };
  store.kycSelfies.set(selfie.id, selfie);

  if (session) {
    session.status = outcome.verificationStatus === 'approved'
      ? 'approved'
      : outcome.verificationStatus === 'rejected'
        ? 'rejected'
        : 'pending_review';
    session.resultData = {
      verificationId: verification.id,
      selfieId: selfie.id,
      confidenceScore
    };
    session.completedAt = now;
    store.kycSessions.set(session.id, session);
  }

  store.kycStatus.set(userId, outcome.kycStatus);

  return {
    handled: true,
    userId,
    status: outcome.kycStatus,
    verification,
    selfie
  };
}
