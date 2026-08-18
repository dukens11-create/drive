import type { PoolClient } from 'pg';
import { env } from '../config/env';
import { getPool } from '../database/postgres';
import {
  exportRestaurantStoreSnapshot,
  importRestaurantStoreSnapshot,
  restaurantStoreCounts
} from './restaurants.service';
import {
  exportRestaurantPosSnapshot,
  importRestaurantPosSnapshot
} from './restaurant-pos.service';

const SNAPSHOT_ID = 'primary';
const POLL_MS = 500;

let persistTimer: NodeJS.Timeout | null = null;
let persistChain: Promise<void> = Promise.resolve();
let lastSerialized = '';
let initialized = false;

type EatSnapshot = {
  version: 1;
  savedAt: string;
  restaurantStore: any;
  posStore: any;
};

function currentSnapshot(): EatSnapshot {
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    restaurantStore: exportRestaurantStoreSnapshot(),
    posStore: exportRestaurantPosSnapshot()
  };
}

async function ensureTable(client?: PoolClient) {
  const executor = client || getPool();
  await executor.query(`
    CREATE TABLE IF NOT EXISTS restaurant_store_snapshots (
      id TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function persistNow() {
  if (env.dataStoreMode !== 'postgres') return;
  const snapshot = currentSnapshot();
  const serialized = JSON.stringify({
    restaurantStore: snapshot.restaurantStore,
    posStore: snapshot.posStore
  });
  if (serialized === lastSerialized) return;

  const pool = getPool();
  await pool.query(
    `INSERT INTO restaurant_store_snapshots (id, payload, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (id)
     DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`,
    [SNAPSHOT_ID, JSON.stringify(snapshot)]
  );
  lastSerialized = serialized;
}

function schedulePersist() {
  persistChain = persistChain
    .then(persistNow)
    .catch(error => {
      console.error(
        '[restaurant-store] persist failed',
        error instanceof Error ? error.message : error
      );
    });
}

export async function initializeRestaurantStorePersistence() {
  if (env.dataStoreMode !== 'postgres') {
    return { enabled: false, restored: false, counts: restaurantStoreCounts() };
  }
  if (!env.databaseUrl) {
    throw new Error('DATABASE_URL is required for restaurant PostgreSQL persistence');
  }
  if (initialized) {
    return { enabled: true, restored: true, counts: restaurantStoreCounts() };
  }

  const pool = getPool();
  await ensureTable();

  const result = await pool.query<{ payload: EatSnapshot }>(
    'SELECT payload FROM restaurant_store_snapshots WHERE id = $1',
    [SNAPSHOT_ID]
  );

  const snapshot = result.rows[0]?.payload;
  let restored = false;

  if (snapshot?.version === 1) {
    importRestaurantStoreSnapshot(snapshot.restaurantStore || { version: 1 });
    importRestaurantPosSnapshot(snapshot.posStore || { version: 1 });
    lastSerialized = JSON.stringify({
      restaurantStore: exportRestaurantStoreSnapshot(),
      posStore: exportRestaurantPosSnapshot()
    });
    restored = true;
  } else {
    await persistNow();
  }

  persistTimer = setInterval(schedulePersist, POLL_MS);
  persistTimer.unref();
  initialized = true;

  return {
    enabled: true,
    restored,
    counts: restaurantStoreCounts()
  };
}

export async function flushRestaurantStorePersistence() {
  if (persistTimer) {
    clearInterval(persistTimer);
    persistTimer = null;
  }
  if (env.dataStoreMode === 'postgres') {
    schedulePersist();
    await persistChain;
  }
  initialized = false;
}