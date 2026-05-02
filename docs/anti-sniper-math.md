# Anti-sniper math

This is the mechanism SolFoundry uses to make first-block snipers unprofitable on every launch. It is not a transfer hook, not a custom AMM, and not a server-side rate limit. It runs entirely on Meteora DAMM v2's native fee scheduler, which means it inherits the AMM's security and is verifiable on-chain by anyone using the [`inspect-pool.ts`](../scripts/inspect-pool.ts) script in this repo.

## The problem

When a token launches on a public AMM, snipers race to be the first transaction in the first block. They do this with bots that:

- Watch the mempool / RPC firehose for pool initialization
- Submit a buy with maximum priority fees the moment liquidity appears
- Sell into the rally as retail buyers chase

Because their entry happens before any natural price discovery, snipers buy at the floor and dump on everyone else. On standard AMMs they typically capture 20–40% of supply in the first slot or two. The chart looks like a vertical wick followed by a slow bleed — the well-known "rugged at launch" pattern.

Most "anti-sniper" solutions try to detect bots after the fact (rate limits, blacklists, max-buy caps), but bots adapt faster than rules. SolFoundry takes a different angle: don't try to stop them, just make their entry economically unprofitable.

## The mechanism

DAMM v2 supports a configurable **base fee schedule** per pool. The schedule decays from a high cliff fee (e.g. 99%) toward a normal trading fee (e.g. 1%) over a configurable number of periods.

```
fee(t) = max(normalFee, cliffFee - reductionFactor * floor(t / periodFrequency))   [Linear mode]
fee(t) = max(normalFee, cliffFee * (1 - reductionFactor)^floor(t / periodFrequency)) [Exponential mode]
```

Where:

- `t` = seconds since pool activation
- `cliffFee` = fee at t=0 (e.g. 99% = `990_000_000` numerator / `1e9` denominator)
- `periodFrequency` = seconds between fee steps (e.g. 30s)
- `numberOfPeriod` = total number of decay steps (e.g. 10)
- `reductionFactor` = how much fee drops per step
- `normalFee` = the floor the schedule decays to (e.g. 1%)

Because the fee is enforced by the AMM contract itself, every swap pays it. There is no "bypass for bots." A sniper buying $10k of supply in slot 0 with a 99% fee pays $9,900 in fees and walks away with $100 of token. They cannot exit profitably.

## Worked example

Schedule:

```
cliffFee = 99%     (cliffFeeNumerator = 990_000_000)
normalFee = 1%
periodFrequency = 30s
numberOfPeriod = 10
mode = Linear
reductionFactor decays cliff → normal across 10 periods (~9.8% per step)
```

| Time elapsed | Effective fee | Sniper buying $10k pays in fees | Token they walk away with |
|---|---|---|---|
| 0s (slot 0) | 99% | $9,900 | $100 |
| 30s | ~89% | $8,900 | $1,100 |
| 60s | ~79% | $7,900 | $2,100 |
| 90s | ~69% | $6,900 | $3,100 |
| 150s | ~50% | $5,000 | $5,000 |
| 270s | ~10% | $1,000 | $9,000 |
| 300s+ | 1% | $100 | $9,900 |

A sniper has two choices:

1. **Buy at the cliff** and accept that they bought $100 of token for $10,000. They can hold for years and never recoup the fee.
2. **Wait for the fee to decay** to a normal level. By then, real holders have entered, price discovery has happened, and the sniper has no information edge. They're just a regular buyer.

Either way, the sniper's information advantage is neutralized.

## Why this is better than transfer hooks

Transfer hooks (Token-2022 extension) can technically block first-block transfers. But they have real costs:

- **Wallet support is uneven.** Many wallets don't render Token-2022 well. Some don't support transfer hooks at all. This fragments the user base.
- **Indexers and trackers lag.** Birdeye, DexScreener, etc. often display Token-2022 launches incorrectly or with delays.
- **They're a different program.** Liquidity routing on aggregators (Jupiter etc.) sometimes treats hook-enabled tokens as unsupported, hurting volume.

A fee schedule on standard SPL tokens has none of these problems. The token is a plain SPL Token, the pool is a standard DAMM v2 pool, and the only difference is the fee curve in the early seconds.

## Verifying it on-chain

Run [`inspect-pool.ts`](../scripts/inspect-pool.ts) against any pool to read the fee scheduler config:

```bash
npx tsx scripts/inspect-pool.ts <poolId> mainnet-beta
```

Output includes the cliff fee, period frequency, number of periods, mode (Linear/Exponential), and reduction factor — the same values pasted into the launchpad config at deploy time.

## Caveats

- **The cliff fee accrues to LPs**, not to the project or to SolFoundry. This means real holders who provide liquidity early actually benefit from sniper attempts. It is a positive feedback loop in favor of legitimate participants.
- **The schedule applies to all swaps** during the cliff window, not just bots. A genuinely fast retail buyer hitting the pool in second 5 also pays an elevated fee. The trade-off is that the schedule has to be steep enough to deter bots, and short enough not to punish real users for too long.
- **The schedule does not prevent a malicious launcher from owning the LP.** That is solved separately by the SolFoundry trust controls (revoking mint/freeze authority, locking metadata, optional permanent LP lock).

The fee scheduler attacks one specific problem: the first-block sniper. It does it well, transparently, and with no proprietary code paths.
