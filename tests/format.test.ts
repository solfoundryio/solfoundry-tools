import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { describeActivation, formatDuration, formatPercent } from '../src/lib/format';

describe('formatDuration', () => {
  it('renders seconds when under a minute', () => {
    assert.equal(formatDuration(0), '0s');
    assert.equal(formatDuration(45), '45s');
  });

  it('renders minutes + seconds when between 1m and 1h', () => {
    assert.equal(formatDuration(60), '1m');
    assert.equal(formatDuration(125), '2m 5s');
  });

  it('renders hours + minutes when over an hour', () => {
    assert.equal(formatDuration(3_600), '1h');
    assert.equal(formatDuration(3_660), '1h 1m');
    assert.equal(formatDuration(7_320), '2h 2m');
  });

  it('normalises negative inputs', () => {
    assert.equal(formatDuration(-90), '1m 30s');
  });
});

describe('formatPercent', () => {
  it('multiplies by 100 and pads decimals', () => {
    assert.equal(formatPercent(0.99), '99.00%');
    assert.equal(formatPercent(0.0001, 4), '0.0100%');
  });

  it('respects custom fraction digits', () => {
    assert.equal(formatPercent(0.5, 0), '50%');
  });
});

describe('describeActivation', () => {
  it('reports NO GATE when activation is the zero sentinel', () => {
    const result = describeActivation(0, 1_700_000_000_000);
    assert.ok(result);
    assert.equal(result.status, 'no-gate');
  });

  it('reports GATED when activation is in the future', () => {
    const nowMs = 1_700_000_000_000;
    const nowSeconds = nowMs / 1000;
    const result = describeActivation(nowSeconds + 120, nowMs);
    assert.ok(result);
    assert.equal(result.status, 'gated');
    assert.match(result.label, /opens in 2m/);
  });

  it('reports OPEN when activation is in the past', () => {
    const nowMs = 1_700_000_000_000;
    const nowSeconds = nowMs / 1000;
    const result = describeActivation(nowSeconds - 180, nowMs);
    assert.ok(result);
    assert.equal(result.status, 'open');
    assert.match(result.label, /opened 3m ago/);
  });
});
