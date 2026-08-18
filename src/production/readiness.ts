import { env } from '../config/env';
import { healthCheck } from '../database/postgres';

type ReadinessIssue = { level: 'error' | 'warning'; key: string; message: string };

function isPlaceholder(value?: string) {
  if (!value) return true;
  const normalized = value.toLowerCase();
  return normalized.includes('replace-with') ||
    normalized.includes('dev-local') ||
    normalized.includes('test123') ||
    normalized.includes('example.com');
}

export function inspectProductionConfiguration() {
  const issues: ReadinessIssue[] = [];

  if (env.nodeEnv !== 'production') {
    issues.push({ level: 'warning', key: 'NODE_ENV', message: 'NODE_ENV is not production.' });
  }

  if (env.nodeEnv === 'production' && env.dataStoreMode !== 'postgres') {
    issues.push({
      level: 'error',
      key: 'DATA_STORE_MODE',
      message: 'Production must use DATA_STORE_MODE=postgres. File/memory storage is not launch-safe.'
    });
  }

  if (env.dataStoreMode === 'postgres' && !env.databaseUrl) {
    issues.push({ level: 'error', key: 'DATABASE_URL', message: 'DATABASE_URL is required.' });
  }

  if (env.nodeEnv === 'production' && isPlaceholder(env.jwtSecret)) {
    issues.push({ level: 'error', key: 'JWT_SECRET', message: 'Use a unique production JWT secret.' });
  }

  if (env.nodeEnv === 'production' && isPlaceholder(env.adminSeedPassword)) {
    issues.push({ level: 'error', key: 'ADMIN_SEED_PASSWORD', message: 'Replace the default admin password.' });
  }

  if (env.nodeEnv === 'production') {
    if (!env.stripeSecretKey) issues.push({ level: 'error', key: 'STRIPE_SECRET_KEY', message: 'Live Stripe secret key is missing.' });
    if (!env.stripePublishableKey) issues.push({ level: 'error', key: 'STRIPE_PUBLISHABLE_KEY', message: 'Live Stripe publishable key is missing.' });
    if (!env.stripeWebhookSecret) issues.push({ level: 'error', key: 'STRIPE_WEBHOOK_SECRET', message: 'Stripe webhook signing secret is missing.' });

    if (!env.appBaseUrl?.startsWith('https://')) {
      issues.push({ level: 'error', key: 'APP_BASE_URL', message: 'Production APP_BASE_URL must use HTTPS.' });
    }

    const origins = String(env.corsAllowedOrigins || '').split(',').map(v => v.trim()).filter(Boolean);
    if (!origins.length || origins.some(origin => origin === '*' || origin.includes('localhost') || origin.includes('127.0.0.1'))) {
      issues.push({ level: 'error', key: 'CORS_ALLOWED_ORIGINS', message: 'Production CORS must list only real HTTPS FlupFlap origins.' });
    }

    if (!env.posCredentialsEncryptionKey) {
      issues.push({
        level: 'error',
        key: 'POS_CREDENTIALS_ENCRYPTION_KEY',
        message: 'A unique POS credential encryption key is required before storing restaurant Square/Toast/Clover credentials.'
      });
    }
    if (!env.redisUrl) {
      issues.push({ level: 'warning', key: 'REDIS_URL', message: 'Redis is recommended before horizontal scaling and durable queue rollout.' });
    }

    if (!env.kycProviderApiKey || !env.kycTemplateId || !env.kycProviderWebhookSecret) {
      issues.push({ level: 'error', key: 'KYC', message: 'Real driver KYC provider credentials/template/webhook are not fully configured.' });
    }

    if (!env.twilioAccountSid || !env.twilioAuthToken || !env.twilioFromNumber) {
      issues.push({ level: 'warning', key: 'TWILIO', message: 'Live SMS configuration is incomplete.' });
    }

    if (!env.sendGridApiKey || !env.sendGridFromEmail) {
      issues.push({ level: 'warning', key: 'SENDGRID', message: 'Live email configuration is incomplete.' });
    }

    if (!env.fcmProjectId || !env.fcmPrivateKey || !env.fcmClientEmail) {
      issues.push({ level: 'warning', key: 'FCM', message: 'Live push notification configuration is incomplete.' });
    }
  }

  return {
    ok: issues.every(issue => issue.level !== 'error'),
    issues
  };
}

export async function productionReadiness() {
  const config = inspectProductionConfiguration();
  let database = { ok: env.dataStoreMode !== 'postgres', latencyMs: 0 };

  if (env.dataStoreMode === 'postgres' && env.databaseUrl) {
    database = await healthCheck();
  }

  const issues = [...config.issues];
  if (!database.ok) {
    issues.push({ level: 'error' as const, key: 'DATABASE_URL', message: 'PostgreSQL health check failed.' });
  }

  return {
    ok: issues.every(issue => issue.level !== 'error'),
    nodeEnv: env.nodeEnv,
    dataStoreMode: env.dataStoreMode,
    database,
    issues
  };
}