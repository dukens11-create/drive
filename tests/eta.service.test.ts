import assert from 'node:assert/strict';
import { test } from 'node:test';
import { estimateRoute } from '../src/services/eta.service';

test('estimateRoute falls back to mock estimate without valid coordinates', async () => {
  const route = await estimateRoute({ distanceMiles: 5, etaMinutes: 9 });
  assert.equal(route.provider, 'mock_fallback');
  assert.equal(route.distanceMiles, 5);
  assert.equal(route.etaMinutes, 9);
});

test('estimateRoute uses cache for repeated mapbox coordinate requests', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;

  globalThis.fetch = (async () => {
    calls += 1;
    return {
      ok: true,
      json: async () => ({
        routes: [
          {
            distance: 3218.688,
            duration: 660,
            geometry: 'encoded-polyline',
            legs: [
              {
                steps: [
                  {
                    distance: 1000,
                    duration: 210,
                    maneuver: { instruction: 'Head north' }
                  }
                ]
              }
            ]
          }
        ]
      })
    } as Response;
  }) as typeof fetch;

  try {
    const input = {
      pickupLat: 37.7749,
      pickupLng: -122.4194,
      dropoffLat: 37.784,
      dropoffLng: -122.4075
    };
    const first = await estimateRoute(input);
    const second = await estimateRoute(input);

    assert.equal(first.provider, 'mapbox');
    assert.equal(first.cached, false);
    assert.equal(second.provider, 'mapbox');
    assert.equal(second.cached, true);
    assert.equal(second.distanceMiles, first.distanceMiles);
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('estimateRoute falls back when mapbox fetch fails', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => ({ ok: false } as unknown as Response)) as typeof fetch;

  try {
    const route = await estimateRoute({
      pickupLat: 37.7,
      pickupLng: -122.4,
      dropoffLat: 37.8,
      dropoffLng: -122.3,
      distanceMiles: 4.2
    });
    assert.equal(route.provider, 'mock_fallback');
    assert.equal(route.distanceMiles, 4.2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
