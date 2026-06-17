import { afterEach, describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { getRpcUrl, parseNetwork } from '../src/lib/connection';

const ENV_KEY = 'SOLFOUNDRY_TOOLS_RPC_URL';
const previousOverride = process.env[ENV_KEY];

afterEach(() => {
  if (previousOverride === undefined) {
    delete process.env[ENV_KEY];
  } else {
    process.env[ENV_KEY] = previousOverride;
  }
});

describe('parseNetwork', () => {
  it('returns the default when the argument is missing', () => {
    assert.equal(parseNetwork(undefined), 'devnet');
  });

  it('accepts the documented network names', () => {
    assert.equal(parseNetwork('devnet'), 'devnet');
    assert.equal(parseNetwork('mainnet-beta'), 'mainnet-beta');
  });

  it('throws for unknown network names', () => {
    assert.throws(() => parseNetwork('testnet'), /Unknown network/);
  });

  it('honours an explicit fallback', () => {
    assert.equal(parseNetwork(undefined, 'mainnet-beta'), 'mainnet-beta');
  });
});

describe('getRpcUrl', () => {
  it('returns the default mainnet RPC when no override is set', () => {
    delete process.env[ENV_KEY];
    assert.equal(getRpcUrl('mainnet-beta'), 'https://api.mainnet-beta.solana.com');
  });

  it('returns the default devnet RPC when no override is set', () => {
    delete process.env[ENV_KEY];
    assert.equal(getRpcUrl('devnet'), 'https://api.devnet.solana.com');
  });

  it('respects the SOLFOUNDRY_TOOLS_RPC_URL override', () => {
    process.env[ENV_KEY] = 'https://my-private-rpc.example.com';
    assert.equal(getRpcUrl('mainnet-beta'), 'https://my-private-rpc.example.com');
    assert.equal(getRpcUrl('devnet'), 'https://my-private-rpc.example.com');
  });

  it('ignores an empty override', () => {
    process.env[ENV_KEY] = '';
    assert.equal(getRpcUrl('devnet'), 'https://api.devnet.solana.com');
  });
});
