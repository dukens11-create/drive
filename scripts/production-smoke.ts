const base = String(process.argv[2] || process.env.APP_BASE_URL || '').replace(/\/+$/, '');
if (!base) {
  console.error('Usage: npm run smoke:prod -- https://your-api.example');
  process.exit(2);
}

async function request(path: string, init: RequestInit = {}) {
  const started = Date.now();
  const response = await fetch(`${base}${path}`, {
    ...init,
    signal: AbortSignal.timeout(12_000)
  });
  const text = await response.text();
  let body: any = text;
  try { body = text ? JSON.parse(text) : null; } catch {}
  return { response, body, latencyMs: Date.now() - started };
}

async function main() {
  const checks: any[] = [];

  for (const path of ['/health', '/livez', '/readyz']) {
    const result = await request(path);
    checks.push({ path, status: result.response.status, latencyMs: result.latencyMs });
    if (!result.response.ok) throw new Error(`${path} returned ${result.response.status}`);
  }

  const config = await request('/api/config');
  checks.push({ path: '/api/config', status: config.response.status, latencyMs: config.latencyMs });
  if (!config.response.ok) throw new Error('/api/config failed');

  const serializedConfig = JSON.stringify(config.body || {});
  const forbidden = ['STRIPE_SECRET', 'JWT_SECRET', 'PRIVATE_KEY', 'AUTH_TOKEN', 'APPLICATION_SECRET'];
  for (const marker of forbidden) {
    if (serializedConfig.toUpperCase().includes(marker)) {
      throw new Error(`/api/config appears to expose a forbidden secret marker: ${marker}`);
    }
  }

  const unauth = await request('/api/rides/history');
  checks.push({ path: '/api/rides/history (unauthenticated)', status: unauth.response.status, latencyMs: unauth.latencyMs });
  if (![401, 403].includes(unauth.response.status)) {
    throw new Error(`protected ride history returned ${unauth.response.status} without auth`);
  }

  console.log(JSON.stringify({ ok: true, base, checks }, null, 2));
}

main().catch(error => {
  console.error(JSON.stringify({ ok: false, base, error: error instanceof Error ? error.message : String(error) }, null, 2));
  process.exit(1);
});