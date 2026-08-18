const base = String(process.argv[2] || process.env.APP_BASE_URL || 'http://localhost:8080').replace(/\/+$/, '');
const url = new URL(base);
const allowed =
  ['localhost', '127.0.0.1'].includes(url.hostname) ||
  url.hostname.includes('staging') ||
  process.env.ALLOW_PRODUCTION_LOAD_TEST === 'true';

if (!allowed) {
  console.error('Refusing to load-test a production-looking host. Use staging or set ALLOW_PRODUCTION_LOAD_TEST=true deliberately.');
  process.exit(2);
}

const total = Math.max(1, Math.min(5000, Number(process.env.LOAD_REQUESTS || 300)));
const concurrency = Math.max(1, Math.min(50, Number(process.env.LOAD_CONCURRENCY || 10)));
const latencies: number[] = [];
let failures = 0;
let cursor = 0;

async function worker() {
  while (true) {
    const index = cursor++;
    if (index >= total) return;
    const started = performance.now();
    try {
      const response = await fetch(`${base}/health`, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) failures += 1;
    } catch {
      failures += 1;
    } finally {
      latencies.push(performance.now() - started);
    }
  }
}

async function main() {
  const started = Date.now();
  await Promise.all(Array.from({ length: concurrency }, worker));
  latencies.sort((a, b) => a - b);
  const percentile = (p: number) => latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * p))] || 0;
  const durationMs = Date.now() - started;
  const summary = {
    ok: failures === 0,
    base,
    requests: total,
    concurrency,
    failures,
    durationMs,
    requestsPerSecond: Number((total / Math.max(0.001, durationMs / 1000)).toFixed(2)),
    p50Ms: Number(percentile(0.50).toFixed(1)),
    p95Ms: Number(percentile(0.95).toFixed(1)),
    p99Ms: Number(percentile(0.99).toFixed(1))
  };
  console.log(JSON.stringify(summary, null, 2));
  if (failures > 0) process.exit(1);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});