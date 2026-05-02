# solfoundry-tools

Public, MIT-licensed scripts and docs for inspecting and integrating with launches built on [SolFoundry](https://solfoundry.io) — a trust-first token launchpad on Solana with anti-sniper protection by default.

This repo is a small set of utilities the team uses (and ships publicly) so anyone in the Solana ecosystem can:

- Verify the fee scheduler / activation gate on any Meteora DAMM v2 pool
- Read the SolFoundry attribution marker stored in a token's metadata JSON
- Understand the math behind the anti-sniper fee decay

It is **not** the launchpad source code. The launchpad UI lives at [solfoundry.io](https://solfoundry.io) and is closed-source for now. What's here is on-chain transparency tooling.

## Contents

```
scripts/inspect-pool.ts            # verify fee scheduler + activation on any DAMM v2 pool
examples/read-launch-attribution.ts # read the SolFoundry attribution marker from a token mint
docs/anti-sniper-math.md           # how the fee decay curve works and why it kills snipers
```

## Quick start

```bash
git clone https://github.com/solfoundryio/solfoundry-tools.git
cd solfoundry-tools
npm install
```

### Inspect a pool

```bash
npx tsx scripts/inspect-pool.ts <poolId> [network]
# network defaults to devnet; pass "mainnet-beta" for production
```

Output covers token mints + vaults, liquidity, activation gate (Fair Launch Window), and the full fee scheduler config (mode, cliff fee, periods, decay).

### Read SolFoundry attribution from a token

```bash
npx tsx examples/read-launch-attribution.ts <mintAddress> [network]
```

Pulls the off-chain metadata JSON via the on-chain URI and prints any SolFoundry attribution fields. Useful for indexers and trackers.

### Read the anti-sniper math

See [`docs/anti-sniper-math.md`](docs/anti-sniper-math.md) for the formulas, a worked example, and why a steep cliff fee in slot 0 makes early snipers unprofitable.

## License

MIT. See [`LICENSE`](LICENSE).

## Issues / PRs

Open an issue if a script breaks or you want to see another tool added. PRs welcome — keep changes scoped and tested.

## Related

- Product: [solfoundry.io](https://solfoundry.io)
- Docs: [solfoundry.io/docs](https://solfoundry.io/docs)
- X: [@SolFoundryio](https://x.com/SolFoundryio)
- Telegram: [t.me/solfoundryio](https://t.me/solfoundryio)
