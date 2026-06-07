import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import net, { type AddressInfo } from 'node:net';
import { test } from 'node:test';

function createTempDir(prefix: string) {
  return mkdtempSync(path.join(os.tmpdir(), prefix));
}

function removeTempDir(dir: string) {
  rmSync(dir, { recursive: true, force: true });
}

async function getFreePort() {
  const server = net.createServer();
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const { port } = server.address() as AddressInfo;
  await new Promise<void>((resolve, reject) => {
    server.close(error => (error ? reject(error) : resolve()));
  });
  return port;
}

async function waitFor(check: () => boolean, timeoutMs: number, message: string) {
  const startedAt = Date.now();
  while (!check()) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error(message);
    }
    await new Promise(resolve => setTimeout(resolve, 25));
  }
}

test('config falls back to .env.example in development when .env is missing', () => {
  const tempDir = createTempDir('drive-env-fallback-');
  try {
    writeFileSync(path.join(tempDir, '.env.example'), 'NODE_ENV=development\nPORT=9091\nLOG_LEVEL=warn\nJWT_SECRET=example-secret\nADMIN_SEED_PASSWORD=example-admin\n');
    const childEnv = { ...process.env };
    delete childEnv.NODE_ENV;
    delete childEnv.PORT;
    delete childEnv.LOG_LEVEL;
    delete childEnv.JWT_SECRET;
    delete childEnv.ADMIN_SEED_PASSWORD;

    const output = execFileSync(
      process.execPath,
      [
        '-e',
        `process.chdir(${JSON.stringify(tempDir)}); const { env } = require(${JSON.stringify(path.join(process.cwd(), 'dist/src/config/env.js'))}); process.stdout.write(JSON.stringify({ port: env.port, logLevel: env.logLevel, loadedEnvFilePath: env.loadedEnvFilePath }));`
      ],
      {
        cwd: process.cwd(),
        env: childEnv,
        encoding: 'utf8'
      }
    );

    const parsed = JSON.parse(output);
    assert.equal(parsed.port, 9091);
    assert.equal(parsed.logLevel, 'warn');
    assert.match(parsed.loadedEnvFilePath, /\.env\.example$/);
  } finally {
    removeTempDir(tempDir);
  }
});

test('server stays running when an unhandled rejection happens after startup', async () => {
  const tempDir = createTempDir('drive-server-startup-');
  const hookPath = path.join(tempDir, 'trigger-rejection.cjs');
  const port = await getFreePort();

  writeFileSync(
    path.join(tempDir, '.env'),
    `NODE_ENV=development\nPORT=${port}\nLOG_LEVEL=debug\nJWT_SECRET=test-secret\nADMIN_SEED_PASSWORD=test-admin-password\n`
  );
  writeFileSync(hookPath, "setTimeout(() => Promise.reject(new Error('post-startup rejection test')), 50);\n");

  const child = spawn(process.execPath, [path.join(process.cwd(), 'dist/src/server.js')], {
    cwd: tempDir,
    env: {
      ...process.env,
      NODE_OPTIONS: [process.env.NODE_OPTIONS, `--require ${hookPath}`].filter(Boolean).join(' ')
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let output = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', chunk => {
    output += chunk;
  });
  child.stderr.on('data', chunk => {
    output += chunk;
  });

  try {
    await waitFor(
      () => output.includes('Server initialization complete') || output.includes('"message":"http server started"'),
      8_000,
      `server did not finish startup\n${output}`
    );
    await waitFor(
      () => output.includes('unhandled rejection after startup; keeping server alive'),
      8_000,
      `server did not log the post-startup rejection warning\n${output}`
    );

    assert.equal(child.exitCode, null, output);
  } finally {
    child.kill('SIGTERM');
    await once(child, 'exit').catch(() => undefined);
    removeTempDir(tempDir);
  }
});
