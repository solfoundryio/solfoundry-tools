/**
 * Inspect a Meteora DAMM v2 pool on devnet/mainnet.
 *
 * Reports token mints, vaults, liquidity, the activation gate (Fair Launch
 * Window), and the full fee scheduler config — useful for verifying that a
 * SolFoundry-launched pool (or any DAMM v2 pool) has the anti-sniper fee
 * decay set up as advertised.
 *
 * Usage:
 *   npx tsx scripts/inspect-pool.ts <poolId> [network]
 *     network: "devnet" (default) or "mainnet-beta"
 *
 * Env:
 *   SOLFOUNDRY_TOOLS_RPC_URL — override the default public RPC for the
 *                              selected network (e.g. a private endpoint).
 */

import { PublicKey } from '@solana/web3.js';
import { CpAmm } from '@meteora-ag/cp-amm-sdk';
import { getConnection, parseNetwork } from '../src/lib/connection';
import { describeActivation, formatDuration, formatPercent } from '../src/lib/format';
import { decodeFeeScheduler } from '../src/lib/fee-scheduler';

function usageAndExit(): never {
  console.error('Usage: npx tsx scripts/inspect-pool.ts <poolId> [network]');
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

  console.log(`\nInspecting pool ${poolIdArg} on ${network}\n`);

  const state = await cpAmm.fetchPoolState(poolId);

  const activationSeconds = state.activationPoint ? Number(state.activationPoint.toString()) : 0;

  console.log('-- Pool basics --');
  console.log(`  Token A mint: ${state.tokenAMint.toBase58()}`);
  console.log(`  Token B mint: ${state.tokenBMint.toBase58()}`);
  console.log(`  Token A vault: ${state.tokenAVault.toBase58()}`);
  console.log(`  Token B vault: ${state.tokenBVault.toBase58()}`);
  console.log(`  Liquidity: ${state.liquidity?.toString() ?? 'n/a'}`);
  console.log(
    `  Permanent locked liquidity: ${state.permanentLockLiquidity?.toString() ?? 'n/a'}`,
  );

  console.log('\n-- Activation (Fair Launch Window) --');
  console.log(`  activationPoint: ${activationSeconds} (unix seconds)`);
  const activation = describeActivation(activationSeconds);
  if (activation) {
    console.log(`  Status: ${activation.label}`);
  }

  console.log('\n-- Fees --');
  const data: number[] = state.poolFees?.baseFee?.baseFeeInfo?.data ?? [];
  const scheduler = decodeFeeScheduler(data);
  switch (scheduler.kind) {
    case 'flat':
      console.log('  Standard flat fee (no scheduler)');
      break;
    case 'unknown':
      console.log(`  Unexpected baseFeeInfo length: ${scheduler.byteLength} bytes`);
      break;
    case 'scheduler': {
      console.log(`  Mode: ${scheduler.mode}`);
      console.log(
        `  Start fee: ${formatPercent(scheduler.startFeeFraction)} (cliffFeeNumerator: ${scheduler.cliffFeeNumerator})`,
      );
      console.log(`  Number of periods: ${scheduler.numberOfPeriod}`);
      console.log(`  Period frequency: ${scheduler.periodFrequencySec}s`);
      console.log(
        `  Total duration: ${scheduler.totalDurationSec}s (${formatDuration(scheduler.totalDurationSec)})`,
      );
      console.log(`  Reduction factor: ${scheduler.reductionFactor}`);
      break;
    }
  }

  console.log('\n-- Authorities & flags --');
  console.log(`  Pool collectFeeMode: ${state.collectFeeMode}`);
  console.log(`  Pool activationType: ${state.activationType}`);
  console.log(`  poolStatus: ${state.poolStatus}`);

  console.log('\nPool inspection complete.\n');
}

main().catch((err) => {
  console.error('Failed to inspect pool:', err instanceof Error ? err.message : err);
  process.exit(1);
});
