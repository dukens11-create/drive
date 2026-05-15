import dotenv from 'dotenv';

dotenv.config();

function getString(name: string, fallback?: string) {
  const value = process.env[name];
  if (value && value.length > 0) return value;
  return fallback;
}

function getRequiredInProduction(name: string, fallback: string) {
  const value = getString(name)?.trim();
  if (process.env.NODE_ENV === 'production') {
    if (!value) {
      throw new Error(`${name} is required in production`);
    }
    if (value === fallback) {
      throw new Error(`${name} must not use the development default in production`);
    }
  }
  return value || fallback;
}

function getPort() {
  const raw = getString('PORT', '8080');
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error('PORT must be a positive number');
  }
  return parsed;
}

function getPositiveNumber(name: string, fallback: number) {
  const raw = getString(name, String(fallback));
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive number`);
  }
  return parsed;
}

function getPositiveInteger(name: string, fallback: number) {
  const value = getPositiveNumber(name, fallback);
  if (!Number.isInteger(value)) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

const dataStoreMode = getString('DATA_STORE_MODE', 'memory') === 'file' ? 'file' : 'memory';

export const env = {
  nodeEnv: getString('NODE_ENV', 'development'),
  port: getPort(),
  jwtSecret: getRequiredInProduction('JWT_SECRET', 'dev-local-secret'),
  adminSeedPassword: getRequiredInProduction('ADMIN_SEED_PASSWORD', 'change_me_admin_password'),
  stripeWebhookSecret: getString('STRIPE_WEBHOOK_SECRET'),
  dataStoreMode,
  dataStoreFile: getString('DATA_STORE_FILE', '.data/store.json'),
  supportTicketRetentionDays: getPositiveNumber('SUPPORT_TICKET_RETENTION_DAYS', 365),
  fraudSignalRetentionDays: getPositiveNumber('FRAUD_SIGNAL_RETENTION_DAYS', 365),
  governanceRequestRetentionDays: getPositiveNumber('GOVERNANCE_REQUEST_RETENTION_DAYS', 730),
  fraudRepeatedRefundThreshold: getPositiveInteger('FRAUD_REPEATED_REFUND_THRESHOLD', 3),
  backupExportDir: getString('BACKUP_EXPORT_DIR', '.data/backups'),
  anonymizedEmailDomain: getString('ANONYMIZED_EMAIL_DOMAIN', 'redacted.local')
};
