# Contributing

Thanks for considering a contribution. This repo is intentionally small and stays focused on one job: **on-chain transparency tooling for SolFoundry and Meteora DAMM v2 launches**. The bar for new code is "does this help anyone verify a launch without trusting a UI".

## What fits

- Read-only on-chain inspectors (mint, metadata, pool state, fee schedulers, lock state).
- Decoders for byte layouts we rely on (with comments pinning the layout).
- Examples that show third parties — indexers, trackers, explorers — how to consume on-chain data we produce.
- Doc improvements that clarify how a launch is verifiable end-to-end.

## What doesn't fit

- Anything that writes to the chain. Signing flows belong in the closed-source launchpad UI, not here.
- Anything that requires a SolFoundry secret, private key, or API token. Everything here must run against any public RPC.
- Marketing copy, branded landing pages, or duplicates of content already on [solfoundry.io](https://solfoundry.io).

## Getting started

```bash
git clone https://github.com/solfoundryio/solfoundry-tools.git
cd solfoundry-tools
npm install
npm run typecheck
```

Verify your environment by running a known-good script against devnet:

```bash
npm run inspect-pool -- <devnet-pool-id>
```

## Code style

- TypeScript strict mode, no `any` without comment.
- Scripts in `scripts/` and `examples/` should stay thin: parse CLI args, call helpers in `src/lib/`, print results. Shared logic moves to `src/lib/`.
- No silent fallbacks. If an input is wrong, exit non-zero with a clear message.
- Default to devnet. Treat mainnet as opt-in.
- Comments explain *why*, not *what*. Byte layouts are an exception — pinning the layout in a comment is the whole point.

## Submitting a PR

1. Open an issue first for anything larger than a small fix. A two-line "I want to add `X` because `Y`" is enough — it saves both sides from sunk cost.
2. Keep changes scoped to one tool or refactor at a time.
3. Add or update an entry in `CHANGELOG.md` under `[Unreleased]`.
4. Make sure `npm run typecheck` and `npm test` pass locally before opening the PR.
5. New helpers in `src/lib/` ship with unit tests under `tests/`. CLI scripts in `scripts/` and `examples/` don't need tests today, but the helpers they call do.

## License

By contributing, you agree your contribution is licensed under the same [MIT license](LICENSE) as the rest of the repo.
