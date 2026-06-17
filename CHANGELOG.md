# Changelog

All notable changes to `solfoundry-tools` are documented here. Format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the
project intends to follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
once a 1.0 contract is declared.

## [Unreleased]

### Added
- `examples/verify-lp-lock.ts` — on-chain check that liquidity is permanently locked on any Meteora DAMM v2 pool. Exits with a clear status code so it can be wired into CI or trust dashboards.
- `src/lib/connection.ts` — shared RPC URL + network parsing. Supports `SOLFOUNDRY_TOOLS_RPC_URL` env override for private endpoints.
- `src/lib/format.ts` — `formatDuration`, `formatPercent`, `describeActivation` helpers used by the scripts.
- `src/lib/fee-scheduler.ts` — structured decoder for the Meteora DAMM v2 `baseFeeInfo` byte layout. Pins the layout once so any script can reuse it.
- README badges (license, Node version, PRs welcome, tests, Solana).
- `CONTRIBUTING.md`.
- Unit tests for `src/lib/connection.ts`, `src/lib/format.ts`, and `src/lib/fee-scheduler.ts` using the built-in `node:test` runner via `tsx`. Run with `npm test`.
- GitHub Actions workflow (`.github/workflows/ci.yml`) that runs `npm ci`, `npm run typecheck`, and `npm test` against Node 18, 20, and 22 on every push and pull request targeting `main`. Status badge added to the README.

### Changed
- `scripts/inspect-pool.ts` refactored to use the shared lib helpers. Output is unchanged; the script is now noticeably shorter and easier to maintain.
- `examples/read-launch-attribution.ts` refactored to share the connection + network parsing helpers and to report invalid pubkey inputs with a clear message instead of a stack trace.
- Network argument parsing is now strict — unknown values fail with a helpful error rather than silently falling back to devnet.

### Fixed
- Lowered the `@meteora-ag/cp-amm-sdk` dependency to the latest published version (`^1.4.3`). The previous pin (`^1.5.0`) referenced an unpublished tag.

## [0.1.0] — 2026-05-02

### Added
- Initial public release.
- `scripts/inspect-pool.ts` — verify fee scheduler + activation gate on any DAMM v2 pool.
- `examples/read-launch-attribution.ts` — read the SolFoundry attribution marker from a token mint.
- `docs/anti-sniper-math.md` — math behind the anti-sniper fee decay.
