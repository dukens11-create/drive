import type { PoolClient } from 'pg';
import { env } from '../config/env';
import { store } from './data.store';
import { getPool } from './postgres';

const SNAPSHOT_ID = 'primary';
const ADVISORY_LOCK_KEY = 740260826;
const POLL_INTERVAL_MS = 500;
const EXCLUDED_KEYS = new Set(['passwordResetTokens']);

let lockClient: PoolClient | null = null;
let persistTimer: NodeJS.Timeout | null = null;
let lastSerialized = '';
let persistChain: Promise<void> = Promise.resolve();
let initialized = false;

type EncodedCollection =
  | { kind: 'map'; entries: Array<[unknown, unknown]> }
  | { kind: 'array'; values: unknown[] };

type StoreSnapshot = {
  version: 1;
  savedAt: string;
  collections: Record<string, EncodedCollection>;
};

function serializeStore(): StoreSnapshot {
  const collections: Record<string, EncodedCollection> = {};

  for (const [key, value] of Object.entries(store as Record<string, unknown>)) {
    if (EXCLUDED_KEYS.has(key)) continue;

    if (value instanceof Map) {
      collections[key] = { kind: 'map', entries: Array.from(value.entries()) };
      continue;
    }

    if (Array.isArray(value)) {
      collections[key] = { kind: 'array', values: Array.from(value) };
    }
  }

  return {
    version: 1,
    savedAt: new Date().toISOString(),
    collections
  };
}

function clearCollection(value: unknown) {
  if (value instanceof Map) {
    value.clear();
    return;
  }
  if (Array.isArray(value)) value.splice(0, value.length);
}

function applySnapshot(snapshot: StoreSnapshot) {
  if (!snapshot || snapshot.version !== 1 || !snapshot.collections) {
    throw new Error('Unsupported PostgreSQL store snapshot format');
  }

  for (const [key, current] of Object.entries(store as Record<string, unknown>)) {
    if (EXCLUDED_KEYS.has(key)) continue;
    if (current instanceof Map || Array.isArray(current)) clearCollection(current);
  }

  for (const [key, encoded] of Object.entries(snapshot.collections)) {
    const target = (store as Record<string, any>)[key];
    if (!target) continue;

    if (encoded.kind === 'map' && target instanceof Map) {
      for (const [mapKey, mapValue] of encoded.entries || []) target.set(mapKey, mapValue);
      continue;
    }

    if (encoded.kind === 'array' && Array.isArray(target)) {
      target.push(...(encoded.values || []));
    }
  }
}

async function ensureSnapshotTable(client: PoolClient) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS app_store_snapshots (
      id TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function persistNow() {
  if (env.dataStoreMode !== 'postgres') return;
  const snapshot = serializeStore();
  const serialized = JSON.stringify(snapshot.collections);
  if (serialized === lastSerialized) return;

  const pool = getPool();
  await pool.query(
    `INSERT INTO app_store_snapshots (id, payload, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (id)
     DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`,
    [SNAPSHOT_ID, JSON.stringify(snapshot)]
  );
  lastSerialized = serialized;
}

function schedulePersist() {
  persistChain = persistChain
    .then(() => persistNow())
    .catch((error) => {
      console.error('[postgres-store] persist failed', error instanceof Error ? error.message : error);
    });
}

export async function initializePostgresStorePersistence() {
  if (env.dataStoreMode !== 'postgres') return { enabled: false, restored: false };
  if (initialized) return { enabled: true, restored: true };
  if (!env.databaseUrl) throw new Error('DATABASE_URL is required when DATA_STORE_MODE=postgres');

  const pool = getPool();
  lockClient = await pool.connect();

  const lockResult = await lockClient.query<{ locked: boolean }>(
    'SELECT pg_try_advisory_lock($1) AS locked',
    [ADVISORY_LOCK_KEY]
  );

  if (!lockResult.rows[0]?.locked) {
    lockClient.release();
    lockClient = null;
    throw new Error(
      'Another FlupFlap backend already owns the PostgreSQL runtime-store lock. ' +
      'The current snapshot persistence mode intentionally permits one backend replica until the full normalized data layer is enabled.'
    );
  }

  await ensureSnapshotTable(lockClient);
  const result = await lockClient.query<{ payload: StoreSnapshot }>(
    'SELECT payload FROM app_store_snapshots WHERE id = $1',
    [SNAPSHOT_ID]
  );

  let restored = false;
  const snapshot = result.rows[0]?.payload;
  if (snapshot) {
    applySnapshot(snapshot);
    lastSerialized = JSON.stringify(serializeStore().collections);
    restored = true;
  } else {
    await persistNow();
  }

  persistTimer = setInterval(schedulePersist, POLL_INTERVAL_MS);
  persistTimer.unref();
  initialized = true;

  return { enabled: true, restored };
}

export async function flushPostgresStorePersistence() {
  if (persistTimer) {
    clearInterval(persistTimer);
    persistTimer = null;
  }

  if (env.dataStoreMode === 'postgres') {
    schedulePersist();
    await persistChain;
  }

  if (lockClient) {
    try {
      await lockClient.query('SELECT pg_advisory_unlock($1)', [ADVISORY_LOCK_KEY]);
    } finally {
      lockClient.release();
      lockClient = null;
    }
  }

  initialized = false;
}