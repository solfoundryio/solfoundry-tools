/**
 * Verify that liquidity is permanently locked on a Meteora DAMM v2 pool.
 *
 * A "locked LP" claim from any launchpad should be verifiable on-chain
 * without trusting the UI. This script reads the pool state directly and
 * reports the locked-to-total ratio plus a verdict the caller can rely on.
 *
 * Usage:
 *   npx tsx examples/verify-lp-lock.ts <poolId> [network]
 *     network: "devnet" (default) or "mainnet-beta"
 *
 * Exits with code 0 when the pool reports ≥99% of liquidity permanently
 * locked, code 2 when partial, code 3 when none. Anything else (network
 * error, bad input) exits 1.
 */

import { PublicKey } from '@solana/web3.js';
import { CpAmm } from '@meteora-ag/cp-amm-sdk';
import { getConnection, parseNetwork } from '../src/lib/connection';
import { formatPercent } from '../src/lib/format';

const FULL_LOCK_THRESHOLD = 0.99;

function usageAndExit(): never {
  console.error('Usage: npx tsx examples/verify-lp-lock.ts <poolId> [network]');
  console.error('  network: "devnet" (default) or "mainnet-beta"');
  process.exit(1);
}

async function main() {
  const poolIdArg = process.argv[2];
  if (!poolIdArg) usageAndExit();

  let network: ReturnType<typeof parseNetwork>;
  try {
    network = parseNetwork(process.argv[3]);
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    usageAndExit();
  }

  let poolId: PublicKey;
  try {
    poolId = new PublicKey(poolIdArg);
  } catch {
    console.error(`"${poolIdArg}" is not a valid Solana public key.`);
    process.exit(1);
  }

  const connection = getConnection(network);
  const cpAmm = new CpAmm(connection);

  console.log(`\nVerifying LP lock for pool ${poolIdArg} on ${network}\n`);

  const state = await cpAmm.fetchPoolState(poolId);
  const total = state.liquidity ? BigInt(state.liquidity.toString()) : 0n;
  const locked = state.permanentLockLiquidity
    ? BigInt(state.permanentLockLiquidity.toString())
    : 0n;

  if (total === 0n) {
    console.log('Total liquidity is zero — nothing to lock yet. Re-run after liquidity is seeded.');
    process.exit(1);
  }

  // Use a high-precision string ratio so we don't lose precision on big BN.
  const ratio = Number((locked * 10_000n) / total) / 10_000;

  console.log(`  Total liquidity:            ${total.toString()}`);
  console.log(`  Permanent locked:           ${locked.toString()}`);
  console.log(`  Locked share:               ${formatPercent(ratio, 2)}`);

  if (ratio >= FULL_LOCK_THRESHOLD) {
    console.log('\n  Verdict: FULLY LOCKED — LP cannot be withdrawn by the deployer.\n');
    process.exit(0);
  }
  if (locked > 0n) {
    console.log('\n  Verdict: PARTIALLY LOCKED — some LP can still be withdrawn.\n');
    process.exit(2);
  }
  console.log('\n  Verdict: UNLOCKED — deployer retains full ability to withdraw LP.\n');
  process.exit(3);
}

main().catch((err) => {
  console.error('Failed to verify LP lock:', err instanceof Error ? err.message : err);
  process.exit(1);
});
