/**
 * PostgreSQL connection pool and query helpers.
 *
 * The pool is lazy-initialised: it is only created the first time `getPool()`
 * is called, so importing this module does NOT open database connections during
 * tests or when DATABASE_URL is absent.
 *
 * All connection parameters are read from the DATABASE_URL environment variable
 * (standard Postgres connection string).
 */

import { Pool, PoolClient, QueryResultRow } from 'pg';

let _pool: Pool | null = null;

/** Returns the shared Pool, creating it on first call. */
export function getPool(): Pool {
  if (!_pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        'DATABASE_URL is not set. Set it in .env or the environment before using the database layer.'
      );
    }
    _pool = new Pool({
      connectionString,
      // Keep the pool small by default; increase via DATABASE_POOL_MAX in env.
      max: Number(process.env.DATABASE_POOL_MAX ?? 10),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });

    _pool.on('error', (err) => {
      console.error('[postgres] idle client error', err.message);
    });
  }
  return _pool;
}

/** Run a parameterised query and return all rows. */
export async function query<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await getPool().query<T>(sql, params);
  return result.rows;
}

/** Run a parameterised query and return the first row (or undefined). */
export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params?: unknown[]
): Promise<T | undefined> {
  const rows = await query<T>(sql, params);
  return rows[0];
}

/**
 * Run multiple SQL statements inside a single transaction.
 * If the callback throws the transaction is rolled back; otherwise committed.
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Check whether the database is reachable. */
export async function healthCheck(): Promise<{ ok: boolean; latencyMs: number }> {
  const start = Date.now();
  try {
    await query('SELECT 1');
    return { ok: true, latencyMs: Date.now() - start };
  } catch {
    return { ok: false, latencyMs: Date.now() - start };
  }
}

/** Gracefully close all pool connections (used during server shutdown). */
export async function closePool(): Promise<void> {
  if (_pool) {
    await _pool.end();
    _pool = null;
  }
}
