/**
 * Display helpers shared by CLI scripts. Kept dependency-free so scripts
 * can import them without dragging in Solana types.
 */

/**
 * Format a duration in seconds as "Xm Ys" or "Xh Ym" when the total exceeds
 * one hour. Negative durations are normalised to their absolute value — the
 * caller decides the direction (past vs future) and labels it.
 */
export function formatDuration(totalSeconds: number): string {
  const abs = Math.abs(Math.floor(totalSeconds));
  if (abs < 60) return `${abs}s`;
  const minutes = Math.floor(abs / 60);
  const seconds = abs % 60;
  if (minutes < 60) {
    return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`;
  }
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  return remMinutes === 0 ? `${hours}h` : `${hours}h ${remMinutes}m`;
}

/**
 * Format a number as a percentage with the given decimal places. Inputs are
 * assumed to be already scaled (e.g. 0.99 → "99.00%"). The helper exists so
 * scripts don't disagree on rounding behaviour.
 */
export function formatPercent(value: number, fractionDigits = 2): string {
  return `${(value * 100).toFixed(fractionDigits)}%`;
}

/**
 * Compare a target unix-seconds timestamp against now and produce a
 * human-readable "GATED — opens in 2m 15s" or "OPEN — opened 8m ago" label.
 * Returns null when the target is the zero-sentinel (no gate).
 *
 * Only valid for pools with activationType = Timestamp (1). Slot-activated
 * pools store a slot number in activationPoint — use describeSlotActivation.
 */
export function describeActivation(
  activationSeconds: number,
  nowMs: number = Date.now(),
): { label: string; status: 'no-gate' | 'gated' | 'open' } | null {
  if (activationSeconds === 0) {
    return { status: 'no-gate', label: 'NO GATE — trading open since pool creation' };
  }
  const nowSeconds = Math.floor(nowMs / 1000);
  const delta = activationSeconds - nowSeconds;
  const iso = new Date(activationSeconds * 1000).toISOString();
  if (delta > 0) {
    return { status: 'gated', label: `GATED — opens in ${formatDuration(delta)} (${iso})` };
  }
  return { status: 'open', label: `OPEN — opened ${formatDuration(-delta)} ago (${iso})` };
}

/** Solana's target slot time. Real slot times drift, so any duration derived
 *  from this is an estimate and is labelled as such in output. */
const APPROX_SECONDS_PER_SLOT = 0.4;

/**
 * Same idea as describeActivation, but for pools with activationType = Slot
 * (0), where activationPoint is a slot number, not a timestamp. Durations are
 * approximate (slot times vary around the 400ms target).
 */
export function describeSlotActivation(
  activationSlot: number,
  currentSlot: number,
): { label: string; status: 'no-gate' | 'gated' | 'open' } | null {
  if (activationSlot === 0) {
    return { status: 'no-gate', label: 'NO GATE — trading open since pool creation' };
  }
  const deltaSlots = activationSlot - currentSlot;
  const approxSeconds = Math.round(Math.abs(deltaSlots) * APPROX_SECONDS_PER_SLOT);
  if (deltaSlots > 0) {
    return {
      status: 'gated',
      label: `GATED — opens at slot ${activationSlot} (${deltaSlots} slots away, ~${formatDuration(approxSeconds)})`,
    };
  }
  return {
    status: 'open',
    label: `OPEN — opened at slot ${activationSlot} (${-deltaSlots} slots ago, ~${formatDuration(approxSeconds)})`,
  };
}
