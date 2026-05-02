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
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { CpAmm } from '@meteora-ag/cp-amm-sdk';

async function main() {
  const poolIdArg = process.argv[2];
  const network = (process.argv[3] || 'devnet') as 'devnet' | 'mainnet-beta';

  if (!poolIdArg) {
    console.error('Usage: npx tsx scripts/inspect-pool.ts <poolId> [network]');
    process.exit(1);
  }

  const rpcUrl =
    network === 'mainnet-beta'
      ? 'https://api.mainnet-beta.solana.com'
      : 'https://api.devnet.solana.com';

  const connection = new Connection(rpcUrl, 'confirmed');
  const poolId = new PublicKey(poolIdArg);
  const cpAmm = new CpAmm(connection);

  console.log(`\nInspecting pool ${poolIdArg} on ${network}\n`);

  const state = await cpAmm.fetchPoolState(poolId);

  const activationPointBN = state.activationPoint;
  const activationSeconds = activationPointBN ? Number(activationPointBN.toString()) : 0;
  const nowSeconds = Math.floor(Date.now() / 1000);
  const deltaSeconds = activationSeconds - nowSeconds;

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
  if (activationSeconds === 0) {
    console.log('  Status: NO GATE — trading open since pool creation');
  } else if (deltaSeconds > 0) {
    const mins = Math.floor(deltaSeconds / 60);
    const secs = deltaSeconds % 60;
    console.log(
      `  Status: GATED — opens in ${mins}m ${secs}s (${new Date(activationSeconds * 1000).toISOString()})`,
    );
  } else {
    const ago = -deltaSeconds;
    const mins = Math.floor(ago / 60);
    console.log(
      `  Status: OPEN — opened ${mins}m ago (${new Date(activationSeconds * 1000).toISOString()})`,
    );
  }

  console.log('\n-- Fees --');
  // Meteora SDK stores fee scheduler params as raw bytes in baseFeeInfo.data.
  // Layout (32 bytes total, little-endian):
  //   [0..8]   cliffFeeNumerator (u64) — fee at t=0, divided by FEE_DENOMINATOR (1e9)
  //   [8]      feeSchedulerMode (u8)   — 0=Linear, 1=Exponential
  //   [9..14]  padding
  //   [14..16] numberOfPeriod (u16)
  //   [16..24] periodFrequency (u64)   — seconds per step
  //   [24..32] reductionFactor (u64)
  const data: number[] = state.poolFees?.baseFee?.baseFeeInfo?.data ?? [];
  if (data.length >= 32) {
    const buf = Buffer.from(data);
    const cliffFeeNumerator = buf.readBigUInt64LE(0);
    const feeSchedulerMode = buf.readUInt8(8);
    const numberOfPeriod = buf.readUInt16LE(14);
    const periodFrequency = buf.readBigUInt64LE(16);
    const reductionFactor = buf.readBigUInt64LE(24);

    const FEE_DENOMINATOR = 1_000_000_000n;
    const startFeePct = (Number(cliffFeeNumerator) / Number(FEE_DENOMINATOR)) * 100;
    const totalDuration = Number(periodFrequency) * numberOfPeriod;
    const modeName =
      feeSchedulerMode === 1 ? 'Exponential' : feeSchedulerMode === 0 ? 'Linear' : `Unknown(${feeSchedulerMode})`;

    console.log(`  Mode: ${modeName}`);
    console.log(`  Start fee: ${startFeePct.toFixed(2)}% (cliffFeeNumerator: ${cliffFeeNumerator})`);
    console.log(`  Number of periods: ${numberOfPeriod}`);
    console.log(`  Period frequency: ${periodFrequency}s`);
    console.log(`  Total duration: ${totalDuration}s (${(totalDuration / 60).toFixed(1)}min)`);
    console.log(`  Reduction factor: ${reductionFactor}`);
  } else if (data.length === 0) {
    console.log('  Standard flat fee (no scheduler)');
  } else {
    console.log(`  Unexpected baseFeeInfo length: ${data.length} bytes`);
  }

  console.log('\n-- Authorities & flags --');
  console.log(`  Pool collectFeeMode: ${state.collectFeeMode}`);
  console.log(`  Pool activationType: ${state.activationType}`);
  console.log(`  poolStatus: ${state.poolStatus}`);

  console.log('\nPool inspection complete.\n');
}

main().catch((err) => {
  console.error('Failed to inspect pool:', err);
  process.exit(1);
});
