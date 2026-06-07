import { withTransaction } from '../postgres';
import { SCHEMA_SQL } from '../schema';

/**
 * Run all pending database migrations.
 *
 * Migration v1 applies the full schema (CREATE TABLE IF NOT EXISTS statements),
 * making it safe to run against both empty and already-migrated databases.
 *
 * When DATABASE_URL is not set the function returns immediately so that the
 * server can start in in-memory mode without a database connection.
 */
export async function runMigrations(): Promise<{ ok: boolean; applied: string[] }> {
  if (!process.env.DATABASE_URL) {
    return { ok: true, applied: [] };
  }

  const applied: string[] = [];

  await withTransaction(async (client) => {
    // Ensure the migrations tracker table exists first so we can read it.
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version    TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const { rows } = await client.query<{ version: string }>(
      'SELECT version FROM schema_migrations ORDER BY applied_at'
    );
    const done = new Set(rows.map((r) => r.version));

    // v1 – full baseline schema (idempotent via IF NOT EXISTS)
    if (!done.has('v1')) {
      await client.query(SCHEMA_SQL);
      await client.query(
        'INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT DO NOTHING',
        ['v1']
      );
      applied.push('v1');
    }
  });

  return { ok: true, applied };
}

if (require.main === module) {
  runMigrations()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error('[migrations] failed:', err.message);
      process.exit(1);
    });
}
