/**
 * Decoder for the Meteora DAMM v2 `baseFeeInfo` byte layout.
 *
 * The Meteora SDK exposes the fee scheduler config as raw bytes inside
 * `state.poolFees.baseFee.baseFeeInfo.data`. The layout is stable but
 * undocumented in places, so we pin it here once and reuse it from any
 * script that needs to read or display fee-scheduler state.
 *
 * Layout (32 bytes total, little-endian):
 *   [0..8]   cliffFeeNumerator (u64) — fee at t=0, divided by FEE_DENOMINATOR
 *   [8]      feeSchedulerMode (u8)   — 0 = Linear, 1 = Exponential
 *   [9..14]  padding
 *   [14..16] numberOfPeriod (u16)
 *   [16..24] periodFrequency (u64)   — seconds per step
 *   [24..32] reductionFactor (u64)
 */

export const FEE_DENOMINATOR = 1_000_000_000n;

export type FeeSchedulerMode = 'Linear' | 'Exponential' | 'Unknown';

export interface DecodedFeeScheduler {
  mode: FeeSchedulerMode;
  modeByte: number;
  cliffFeeNumerator: bigint;
  startFeeFraction: number;
  numberOfPeriod: number;
  periodFrequencySec: bigint;
  totalDurationSec: number;
  reductionFactor: bigint;
}

export interface NoFeeScheduler {
  kind: 'flat';
}

export interface UnknownFeeScheduler {
  kind: 'unknown';
  byteLength: number;
}

export type FeeSchedulerReadout =
  | ({ kind: 'scheduler' } & DecodedFeeScheduler)
  | NoFeeScheduler
  | UnknownFeeScheduler;

/**
 * Decode a `baseFeeInfo.data` byte array into a structured readout. Returns
 * a discriminated union so callers can render or branch on the result
 * without sprinkling length checks everywhere.
 */
export function decodeFeeScheduler(data: readonly number[]): FeeSchedulerReadout {
  if (data.length === 0) return { kind: 'flat' };
  if (data.length < 32) return { kind: 'unknown', byteLength: data.length };

  const buf = Buffer.from(data as number[]);
  const cliffFeeNumerator = buf.readBigUInt64LE(0);
  const modeByte = buf.readUInt8(8);
  const numberOfPeriod = buf.readUInt16LE(14);
  const periodFrequencySec = buf.readBigUInt64LE(16);
  const reductionFactor = buf.readBigUInt64LE(24);

  const mode: FeeSchedulerMode =
    modeByte === 0 ? 'Linear' : modeByte === 1 ? 'Exponential' : 'Unknown';

  const startFeeFraction = Number(cliffFeeNumerator) / Number(FEE_DENOMINATOR);
  const totalDurationSec = Number(periodFrequencySec) * numberOfPeriod;

  return {
    kind: 'scheduler',
    mode,
    modeByte,
    cliffFeeNumerator,
    startFeeFraction,
    numberOfPeriod,
    periodFrequencySec,
    totalDurationSec,
    reductionFactor,
  };
}
