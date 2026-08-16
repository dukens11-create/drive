import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'public/driver-dashboard.js'), 'utf8');

test('Driver demo data is gated out of production', () => {
  assert.match(source, /const DRIVER_DEMO_MODE/);
  assert.match(source, /const MOCK_COMPLETED_RIDES = DRIVER_DEMO_MODE \? \[/);
  assert.match(source, /const MOCK_NEARBY_REQUESTS = DRIVER_DEMO_MODE \? \[/);
  assert.match(source, /const SIMULATION_WAYPOINTS = DRIVER_DEMO_MODE \? \[/);
  assert.match(source, /if \(!DRIVER_DEMO_MODE\) return \[\];/);
  assert.match(source, /GPS simulation is disabled in production/);
});

test('Driver has one effective setupSession and login redirect declaration', () => {
  const setupCount = (source.match(/function setupSession\s*\(/g) || []).length;
  const redirectCount = (source.match(/function redirectToDriverLogin\s*\(/g) || []).length;
  assert.equal(setupCount, 1);
  assert.equal(redirectCount, 1);
});