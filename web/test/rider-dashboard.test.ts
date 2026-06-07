import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { RiderDashboard } from '../src/components/dashboard/RiderDashboard';

test('RiderDashboard renders the premium rider booking layout', () => {
  const markup = renderToStaticMarkup(createElement(RiderDashboard));

  assert.match(markup, /Drive Rider/);
  assert.match(markup, /Rider dashboard/);
  assert.match(markup, /Book and track your ride/);
  assert.match(markup, /Role: RIDER/);
  assert.match(markup, /rider@example.com/);
  assert.match(markup, /39\.62084, -119\.67590/);
  assert.match(markup, /sacramento/);
  assert.match(markup, /\$9\.89 • 3\.2 mi • 11 min/);
  assert.match(markup, /Searching for driver/);
  assert.match(markup, /Driver assigned/);
  assert.match(markup, /Ride completed/);
  assert.match(markup, /© OpenStreetMap contributors/);
});
