# solfoundry-tools

[![License: MIT](https://img.shields.io/badge/License-MIT-brightgreen.svg)](LICENSE)
[![Node ≥18](https://img.shields.io/badge/node-%E2%89%A518-blue.svg)](package.json)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-orange.svg)](CONTRIBUTING.md)
[![Tests](https://img.shields.io/badge/tests-node%3Atest-success.svg)](tests)
[![Solana](https://img.shields.io/badge/Solana-mainnet%20%2B%20devnet-9945FF.svg)](https://solana.com)

Public, MIT-licensed scripts and docs for inspecting and integrating with launches built on [SolFoundry](https://solfoundry.io) — a trust-first token launchpad on Solana with anti-sniper protection by default.

This repo is a small set of utilities the team uses (and ships publicly) so anyone in the Solana ecosystem can:

- Verify the fee scheduler and activation gate on any Meteora DAMM v2 pool
- Verify that liquidity is permanently locked on a pool, on-chain, without trusting any UI
- Read the SolFoundry attribution marker stored in a token's metadata JSON
- Understand the math behind the anti-sniper fee decay

It is **not** the launchpad source code. The launchpad UI lives at [solfoundry.io](https://solfoundry.io) and is closed-source for now. What's here is on-chain transparency tooling.

## Contents

```
scripts/inspect-pool.ts              verify fee scheduler + activation on any DAMM v2 pool
examples/verify-lp-lock.ts           on-chain check that LP is permanently locked
examples/read-launch-attribution.ts  read the SolFoundry attribution marker from a token mint
src/lib/connection.ts                shared RPC + network helpers
src/lib/format.ts                    duration, percent, activation-window formatters
src/lib/fee-scheduler.ts             decoder for Meteora DAMM v2 baseFeeInfo bytes
docs/anti-sniper-math.md             how the fee decay curve works and why it kills snipers
```

## Requirements

- Node.js ≥ 18
- npm (or your package manager of choice)

## Quick start

```bash
git clone https://github.com/solfoundryio/solfoundry-tools.git
cd solfoundry-tools
npm install
```

All scripts default to **devnet**. Pass `mainnet-beta` as the last argument to hit production. Set `SOLFOUNDRY_TOOLS_RPC_URL` to override the default public RPC with your own endpoint.

### Inspect a pool

```bash
npx tsx scripts/inspect-pool.ts <poolId> [network]
# network defaults to devnet; pass "mainnet-beta" for production
```

Output covers token mints, vaults, liquidity, the activation gate (Fair Launch Window), and the full fee scheduler config (mode, cliff fee, periods, decay).

### Verify LP lock

```bash
npx tsx examples/verify-lp-lock.ts <poolId> [network]
```

Reports the locked-vs-total liquidity ratio and exits with a clear status code: `0` fully locked (≥99%), `2` partial, `3` unlocked, `1` for input or network errors. Ideal for CI checks or third-party trust dashboards.

### Read SolFoundry attribution from a token

```bash
npx tsx examples/read-launch-attribution.ts <mintAddress> [network]
```

Pulls the off-chain metadata JSON via the on-chain URI and prints any SolFoundry attribution fields. Useful for indexers and trackers.

### Read the anti-sniper math

See [`docs/anti-sniper-math.md`](docs/anti-sniper-math.md) for the formulas, a worked example, and why a steep cliff fee at slot 0 makes early snipers unprofitable.

## Development

```bash
npm test              # run the unit tests for the src/lib/ helpers
npm run typecheck     # validate types across scripts/, examples/, src/
npm run inspect-pool  # alias for the inspect-pool script
npm run verify-lp-lock
npm run read-attribution
```

Tests use the built-in `node:test` runner (no extra dependency) executed through `tsx`. New helpers in `src/lib/` should ship with coverage.

The codebase is intentionally small. Shared logic lives under `src/lib/`; scripts in `scripts/` and `examples/` are thin CLIs that wire those helpers to `process.argv` and print results.

## Contributing

PRs welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for scope, code style, and how to propose a new tool.

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

## License

MIT. See [`LICENSE`](LICENSE).

## Related

- Product: [solfoundry.io](https://solfoundry.io)
- Docs: [solfoundry.io/docs](https://solfoundry.io/docs)
- X: [@SolFoundryio](https://x.com/SolFoundryio)
- Telegram: [t.me/solfoundryio](https://t.me/solfoundryio)
