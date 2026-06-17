/**
 * Shared RPC connection helpers for scripts in this repo.
 *
 * Centralises network parsing and RPC URL selection so individual scripts
 * stay focused on their on-chain work rather than re-implementing the
 * same network/CLI plumbing.
 */

import { Connection } from '@solana/web3.js';

export type Network = 'devnet' | 'mainnet-beta';

const NETWORK_RPCS: Record<Network, string> = {
  devnet: 'https://api.devnet.solana.com',
  'mainnet-beta': 'https://api.mainnet-beta.solana.com',
};

/**
 * Parse a network argument from `process.argv` (or any string). Falls back
 * to devnet for safety — scripts in this repo are read-only, but defaulting
 * to mainnet would make typos surprising.
 */
export function parseNetwork(arg: string | undefined, fallback: Network = 'devnet'): Network {
  if (!arg) return fallback;
  if (arg === 'devnet' || arg === 'mainnet-beta') return arg;
  throw new Error(`Unknown network "${arg}". Use "devnet" or "mainnet-beta".`);
}

/**
 * Resolve the default public RPC URL for a given network. Override via the
 * `SOLFOUNDRY_TOOLS_RPC_URL` env var when you have a private endpoint with
 * higher rate limits — useful when running these scripts in a tight loop.
 */
export function getRpcUrl(network: Network): string {
  const override = process.env.SOLFOUNDRY_TOOLS_RPC_URL;
  if (override && override.length > 0) return override;
  return NETWORK_RPCS[network];
}

/**
 * Build a `Connection` for the given network with sensible defaults.
 */
export function getConnection(network: Network): Connection {
  return new Connection(getRpcUrl(network), 'confirmed');
}
