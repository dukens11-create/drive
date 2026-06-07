import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { RiderDashboard } from '../components/dashboard/RiderDashboard';

test('RiderDashboard renders the premium booking shell content', () => {
  const markup = renderToStaticMarkup(createElement(RiderDashboard));

  assert.match(markup, /Drive Rider/);
  assert.match(markup, /Rider dashboard/);
  assert.match(markup, /Book and track your ride/);
  assert.match(markup, /Use current location/);
  assert.match(markup, /Economy/);
  assert.match(markup, /Comfort/);
  assert.match(markup, /Premium/);
  assert.match(markup, /\$9\.89 • 3\.2 mi • 11 min/);
  assert.match(markup, /We’re finding the best driver for you\./);
  assert.match(markup, /Mapbox \/ OpenStreetMap/);
});
