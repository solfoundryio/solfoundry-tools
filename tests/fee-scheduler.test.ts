import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { decodeFeeScheduler, FEE_DENOMINATOR } from '../src/lib/fee-scheduler';

describe('decodeFeeScheduler', () => {
  it('reports a flat fee when the data array is empty', () => {
    const result = decodeFeeScheduler([]);
    assert.equal(result.kind, 'flat');
  });

  it('reports unknown when the buffer is too short', () => {
    const result = decodeFeeScheduler([1, 2, 3, 4]);
    assert.equal(result.kind, 'unknown');
    if (result.kind === 'unknown') {
      assert.equal(result.byteLength, 4);
    }
  });

  it('decodes a Linear scheduler with known values', () => {
    // Build a 32-byte buffer matching the documented layout.
    const buf = Buffer.alloc(32);
    buf.writeBigUInt64LE(990_000_000n, 0); // cliffFeeNumerator → 99% of FEE_DENOMINATOR (1e9)
    buf.writeUInt8(0, 8); // Linear mode
    buf.writeUInt16LE(10, 14); // numberOfPeriod
    buf.writeBigUInt64LE(30n, 16); // periodFrequency = 30s
    buf.writeBigUInt64LE(99_000_000n, 24); // reductionFactor

    const result = decodeFeeScheduler(Array.from(buf));
    assert.equal(result.kind, 'scheduler');
    if (result.kind !== 'scheduler') return;
    assert.equal(result.mode, 'Linear');
    assert.equal(result.modeByte, 0);
    assert.equal(result.cliffFeeNumerator, 990_000_000n);
    assert.equal(result.numberOfPeriod, 10);
    assert.equal(result.periodFrequencySec, 30n);
    assert.equal(result.reductionFactor, 99_000_000n);
    assert.equal(result.totalDurationSec, 300);
    // 990_000_000 / 1_000_000_000 = 0.99
    assert.equal(result.startFeeFraction, 0.99);
  });

  it('decodes an Exponential scheduler and exposes the mode label', () => {
    const buf = Buffer.alloc(32);
    buf.writeBigUInt64LE(500_000_000n, 0);
    buf.writeUInt8(1, 8); // Exponential mode
    buf.writeUInt16LE(20, 14);
    buf.writeBigUInt64LE(15n, 16);
    buf.writeBigUInt64LE(50_000_000n, 24);

    const result = decodeFeeScheduler(Array.from(buf));
    assert.equal(result.kind, 'scheduler');
    if (result.kind !== 'scheduler') return;
    assert.equal(result.mode, 'Exponential');
    assert.equal(result.startFeeFraction, 0.5);
    assert.equal(result.totalDurationSec, 300);
  });

  it('labels unknown mode bytes', () => {
    const buf = Buffer.alloc(32);
    buf.writeBigUInt64LE(0n, 0);
    buf.writeUInt8(7, 8); // bogus mode byte
    buf.writeUInt16LE(0, 14);
    buf.writeBigUInt64LE(0n, 16);
    buf.writeBigUInt64LE(0n, 24);

    const result = decodeFeeScheduler(Array.from(buf));
    assert.equal(result.kind, 'scheduler');
    if (result.kind !== 'scheduler') return;
    assert.equal(result.mode, 'Unknown');
    assert.equal(result.modeByte, 7);
  });

  it('exposes FEE_DENOMINATOR as a 1e9 BigInt', () => {
    assert.equal(FEE_DENOMINATOR, 1_000_000_000n);
  });
});
