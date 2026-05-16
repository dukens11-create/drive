import dotenv from 'dotenv';

dotenv.config();

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
  adminSeedPassword: getRequiredInProduction('ADMIN_SEED_PASSWORD', 'change_me_admin_password'),
  stripeWebhookSecret: getString('STRIPE_WEBHOOK_SECRET'),
  dataStoreMode,
  dataStoreFile: getString('DATA_STORE_FILE', '.data/store.json')
};
