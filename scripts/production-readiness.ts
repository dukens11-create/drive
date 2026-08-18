import { productionReadiness } from '../src/production/readiness';
import { closePool } from '../src/database/postgres';

async function main() {
  const result = await productionReadiness();
  console.log(JSON.stringify(result, null, 2));
  await closePool();
  process.exit(result.ok ? 0 : 1);
}

main().catch(async (error) => {
  console.error(error);
  try { await closePool(); } catch {}
  process.exit(1);
});