import { existsSync } from 'fs';
import path from 'path';
import dotenv from 'dotenv';

function loadEnvFile() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath });
    return { path: envPath, source: '.env' as const };
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const exampleEnvPath = path.resolve(process.cwd(), '.env.example');
  if (!isProduction && existsSync(exampleEnvPath)) {
    dotenv.config({ path: exampleEnvPath });
    return { path: exampleEnvPath, source: '.env.example' as const };
  }

  // Load with the explicit `.env` path even when it is absent so dotenv keeps
  // the runtime behavior predictable and any real values still come from process.env.
  dotenv.config({ path: envPath });
  return { path: undefined, source: 'process.env' as const };
}

const loadedEnvFile = loadEnvFile();
export const loadedEnvFilePath = loadedEnvFile.path;
export const loadedEnvFileSource = loadedEnvFile.source;

function getString(name: string, fallback?: string) {
  const value = process.env[name];
  if (value && value.length > 0) return value;
  return fallback;
}

function getRequiredInProduction(name: string, fallback: string) {
  const value = getString(name);
  if (value) return value;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`${name} is required in production`);
  }
  return fallback;
}

function getPort() {
  const raw = getString('PORT', '8080');
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error('PORT must be a positive number');
  }
  return parsed;
}

function getLogLevel() {
  const value = getString('LOG_LEVEL', 'info')?.toLowerCase();
  if (value === 'debug' || value === 'info' || value === 'warn' || value === 'error') {
    return value;
  }
  throw new Error('LOG_LEVEL must be one of debug, info, warn, error');
}

function getStripeConfig() {
  const secretKey = getString('STRIPE_SECRET_KEY');
  const publishableKey = getString('STRIPE_PUBLISHABLE_KEY');
  const webhookSecret = getString('STRIPE_WEBHOOK_SECRET');

  if (Boolean(secretKey) !== Boolean(publishableKey)) {
    const missing = [
      !secretKey ? 'STRIPE_SECRET_KEY' : '',
      !publishableKey ? 'STRIPE_PUBLISHABLE_KEY' : ''
    ].filter(Boolean);
    throw new Error(`Missing Stripe keys: ${missing.join(', ')}`);
  }

  if (process.env.NODE_ENV === 'production' && (!secretKey || !publishableKey || !webhookSecret)) {
    const missing = [
      !secretKey ? 'STRIPE_SECRET_KEY' : '',
      !publishableKey ? 'STRIPE_PUBLISHABLE_KEY' : '',
      !webhookSecret ? 'STRIPE_WEBHOOK_SECRET' : ''
    ].filter(Boolean);
    throw new Error(`Missing Stripe keys: ${missing.join(', ')}`);
  }

  return { secretKey, publishableKey, webhookSecret };
}

const dataStoreMode = getString('DATA_STORE_MODE', 'memory') === 'file' ? 'file' : 'memory';
const stripe = getStripeConfig();

export const env = {
  nodeEnv: getString('NODE_ENV', 'development'),
  port: getPort(),
  logLevel: getLogLevel(),
  jwtSecret: getRequiredInProduction('JWT_SECRET', 'dev-local-secret'),
  adminSeedPassword: getRequiredInProduction('ADMIN_SEED_PASSWORD', 'FlupflapHaiti2025@'),
  stripeSecretKey: stripe.secretKey,
  stripePublishableKey: stripe.publishableKey,
  stripeWebhookSecret: stripe.webhookSecret,
  kycProvider: getString('KYC_PROVIDER', 'persona'),
  kycProviderApiKey: getString('KYC_PROVIDER_API_KEY'),
  kycProviderWebhookSecret: getString('KYC_PROVIDER_WEBHOOK_SECRET'),
  kycTemplateId: getString('KYC_TEMPLATE_ID'),
  kycProviderBaseUrl: getString('KYC_PROVIDER_BASE_URL', 'https://verify.drive.local'),
  dataStoreMode,
  dataStoreFile: getString('DATA_STORE_FILE', '.data/store.json'),
  // Twilio (SMS)
  twilioAccountSid: getString('TWILIO_ACCOUNT_SID'),
  twilioAuthToken: getString('TWILIO_AUTH_TOKEN'),
  twilioPhoneNumber: getString('TWILIO_PHONE_NUMBER', getString('TWILIO_FROM_NUMBER')),
  twilioFromNumber: getString('TWILIO_FROM_NUMBER', getString('TWILIO_PHONE_NUMBER')),
  // SendGrid (email)
  sendGridApiKey: getString('SENDGRID_API_KEY'),
  sendGridFromEmail: getString('SENDGRID_FROM_EMAIL'),
  sendGridFromName: getString('SENDGRID_FROM_NAME', 'Drive App'),
  // Firebase Cloud Messaging (push notifications)
  fcmServerKey: getString('FCM_SERVER_KEY'),
  fcmProjectId: getString('FIREBASE_PROJECT_ID'),
  fcmPrivateKey: getString('FIREBASE_PRIVATE_KEY'),
  fcmClientEmail: getString('FIREBASE_CLIENT_EMAIL'),
  // App base URL for links in emails
  appBaseUrl: getString('APP_BASE_URL', 'https://app.drive.com'),
  // Sentry
  sentryDsn: getString('SENTRY_DSN'),
  // Mapbox public token (safe to expose to browser clients)
  mapboxPublicToken: getString(
    'MAPBOX_PUBLIC_TOKEN',
    'pk.eyJ1IjoiZmx1cGZsYXAiLCJhIjoiY21wMjI3M3dpMDN5eTJycHMyeG8yaDZ3OCJ9.VUXlzIoU5Gxfj6-BVjnxag'
  ),
  mapboxApiKey: getString('MAPBOX_API_KEY'),
  // PostgreSQL database connection
  databaseUrl: getString('DATABASE_URL'),
  databasePoolMax: Number(getString('DATABASE_POOL_MAX', '10')),
  loadedEnvFilePath,
  loadedEnvFileSource,
  corsAllowedOrigins: getString('CORS_ALLOWED_ORIGINS')
};

const hasAnyFirebaseCredential = Boolean(env.fcmProjectId || env.fcmPrivateKey || env.fcmClientEmail);
const hasAllFirebaseCredentials = Boolean(env.fcmProjectId && env.fcmPrivateKey && env.fcmClientEmail);
if (hasAnyFirebaseCredential && !hasAllFirebaseCredentials) {
  throw new Error('FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, and FIREBASE_CLIENT_EMAIL must be set together');
}

if (env.dataStoreMode === 'file' && !env.dataStoreFile.trim()) {
  throw new Error('DATA_STORE_FILE must be set when DATA_STORE_MODE=file');
}

if (env.loadedEnvFileSource === '.env.example') {
  console.warn('[config] Loaded .env.example fallback. Create / update .env for persistent local configuration.');
}

if (env.loadedEnvFileSource === 'process.env' && env.nodeEnv !== 'production') {
  console.warn('[config] No .env file found. Using process environment values only.');
}
