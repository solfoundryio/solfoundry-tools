/**
 * Read SolFoundry attribution from a token's metadata JSON.
 *
 * SolFoundry-launched tokens carry a small attribution marker inside the
 * off-chain metadata JSON pointed to by the on-chain Metaplex metadata
 * account. This script:
 *
 *   1. Resolves the metadata PDA for a given mint.
 *   2. Decodes the on-chain metadata account to get the URI.
 *   3. Fetches the JSON.
 *   4. Prints any SolFoundry-specific fields plus the standard fields.
 *
 * Useful for indexers, trackers, and explorer integrations that want to
 * display "launched on SolFoundry" badges or filter discovery feeds.
 *
 * Usage:
 *   npx tsx examples/read-launch-attribution.ts <mintAddress> [network]
 *     network: "devnet" (default) or "mainnet-beta"
 */

import { PublicKey } from '@solana/web3.js';
import { getConnection, parseNetwork } from '../src/lib/connection';

const METAPLEX_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

interface OffchainMetadata {
  name?: string;
  symbol?: string;
  description?: string;
  image?: string;
  external_url?: string;
  attributes?: Array<{ trait_type: string; value: string | number }>;
  // Common SolFoundry attribution field — placed by the launchpad in the
  // metadata JSON when the user does not customize the creator marker.
  solfoundry?: {
    launchedWith?: string;
    launchUrl?: string;
    timestamp?: string;
  };
  // Some integrations also place a flat "launched_with" key.
  launched_with?: string;
}

function findMetadataPda(mint: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('metadata'), METAPLEX_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    METAPLEX_PROGRAM_ID,
  );
  return pda;
}

/**
 * Minimal Metaplex Token Metadata account decoder. We only need the URI
 * field. Layout (relevant portion):
 *   [0]          key (1 byte)
 *   [1..33]      update_authority (32 bytes)
 *   [33..65]     mint (32 bytes)
 *   [65..69]     name length prefix (u32 LE) + name bytes (32 max)
 *   [...]        symbol length prefix (u32 LE) + symbol bytes (10 max)
 *   [...]        uri length prefix (u32 LE) + uri bytes (200 max)
 */
function decodeUri(data: Buffer): string {
  let offset = 1 + 32 + 32; // key + update_authority + mint

  // name
  const nameLen = data.readUInt32LE(offset);
  offset += 4 + nameLen;

  // symbol
  const symbolLen = data.readUInt32LE(offset);
  offset += 4 + symbolLen;

  // uri
  const uriLen = data.readUInt32LE(offset);
  offset += 4;
  const uriBytes = data.slice(offset, offset + uriLen);
  return uriBytes.toString('utf8').replace(/\0+$/, '').trim();
}

async function main() {
  const mintArg = process.argv[2];

  if (!mintArg) {
    console.error('Usage: npx tsx examples/read-launch-attribution.ts <mintAddress> [network]');
    console.error('  network: "devnet" (default) or "mainnet-beta"');
    process.exit(1);
  }

  let network: ReturnType<typeof parseNetwork>;
  try {
    network = parseNetwork(process.argv[3]);
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }

  let mint: PublicKey;
  try {
    mint = new PublicKey(mintArg);
  } catch {
    console.error(`"${mintArg}" is not a valid Solana public key.`);
    process.exit(1);
  }

  const connection = getConnection(network);
  const metadataPda = findMetadataPda(mint);

  console.log(`\nMint:        ${mint.toBase58()}`);
  console.log(`Metadata PDA: ${metadataPda.toBase58()}\n`);

  const accountInfo = await connection.getAccountInfo(metadataPda);
  if (!accountInfo) {
    console.error('No metadata account found for this mint.');
    process.exit(1);
  }

  const uri = decodeUri(accountInfo.data);
  if (!uri) {
    console.error('Metadata account exists but URI is empty.');
    process.exit(1);
  }
  console.log(`URI: ${uri}\n`);

  const res = await fetch(uri);
  if (!res.ok) {
    console.error(`Failed to fetch metadata JSON: HTTP ${res.status}`);
    process.exit(1);
  }
  const meta = (await res.json()) as OffchainMetadata;

  console.log('-- Token --');
  console.log(`  Name:        ${meta.name ?? 'n/a'}`);
  console.log(`  Symbol:      ${meta.symbol ?? 'n/a'}`);
  console.log(`  Description: ${meta.description ?? 'n/a'}`);
  console.log(`  Image:       ${meta.image ?? 'n/a'}`);

  console.log('\n-- Attribution --');
  if (meta.solfoundry) {
    console.log('  Launched on SolFoundry: YES');
    console.log(`  launchedWith: ${meta.solfoundry.launchedWith ?? 'n/a'}`);
    console.log(`  launchUrl:    ${meta.solfoundry.launchUrl ?? 'n/a'}`);
    console.log(`  timestamp:    ${meta.solfoundry.timestamp ?? 'n/a'}`);
  } else if (meta.launched_with === 'solfoundry') {
    console.log('  Launched on SolFoundry: YES (flat marker)');
  } else {
    console.log('  No SolFoundry attribution marker found.');
    console.log('  This token may have been launched elsewhere or with attribution opted out.');
  }

  console.log('');
}

main().catch((err) => {
  console.error('Failed to read attribution:', err);
  process.exit(1);
});
