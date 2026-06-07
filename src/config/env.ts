import { existsSync } from 'fs';
import path from 'path';
import dotenv from 'dotenv';

function loadEnvFile() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath });
    return envPath;
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const exampleEnvPath = path.resolve(process.cwd(), '.env.example');
  if (!isProduction && existsSync(exampleEnvPath)) {
    dotenv.config({ path: exampleEnvPath });
    return exampleEnvPath;
  }

  // Load with the explicit `.env` path even when it is absent so dotenv keeps
  // the runtime behavior predictable and any real values still come from process.env.
  dotenv.config({ path: envPath });
  return undefined;
}

export const loadedEnvFilePath = loadEnvFile();

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

const dataStoreMode = getString('DATA_STORE_MODE', 'memory') === 'file' ? 'file' : 'memory';

export const env = {
  nodeEnv: getString('NODE_ENV', 'development'),
  port: getPort(),
  logLevel: getLogLevel(),
  jwtSecret: getRequiredInProduction('JWT_SECRET', 'dev-local-secret'),
  adminSeedPassword: getRequiredInProduction('ADMIN_SEED_PASSWORD', 'FlupflapHaiti2025@'),
  stripeWebhookSecret: getString('STRIPE_WEBHOOK_SECRET'),
  dataStoreMode,
  dataStoreFile: getString('DATA_STORE_FILE', '.data/store.json'),
  // Twilio (SMS)
  twilioAccountSid: getString('TWILIO_ACCOUNT_SID'),
  twilioAuthToken: getString('TWILIO_AUTH_TOKEN'),
  twilioFromNumber: getString('TWILIO_FROM_NUMBER'),
  // SendGrid (email)
  sendGridApiKey: getString('SENDGRID_API_KEY'),
  sendGridFromEmail: getString('SENDGRID_FROM_EMAIL'),
  // Firebase Cloud Messaging (push notifications)
  fcmServerKey: getString('FCM_SERVER_KEY'),
  // App base URL for links in emails
  appBaseUrl: getString('APP_BASE_URL', 'https://app.drive.com'),
  // Sentry
  sentryDsn: getString('SENTRY_DSN'),
  // Mapbox public token (safe to expose to browser clients)
  mapboxPublicToken: getString(
    'MAPBOX_PUBLIC_TOKEN',
    'pk.eyJ1IjoiZmx1cGZsYXAiLCJhIjoiY21wMjI3M3dpMDN5eTJycHMyeG8yaDZ3OCJ9.VUXlzIoU5Gxfj6-BVjnxag'
  ),
  loadedEnvFilePath
};
