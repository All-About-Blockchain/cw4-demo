import { NextResponse } from 'next/server';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { Slip10RawIndex } from '@cosmjs/crypto';

// Derive multiple addresses for multiple prefixes from the admin mnemonic
const ADMIN_MNEMONIC = process.env.ADMIN_MNEMONIC!;

// Supported chain prefixes (expandable)
const PREFIXES = ['juno', 'neutron', 'cosmos'];

// First N accounts to derive for admin recognition
const NUM_ACCOUNTS = 20;

export async function GET() {
  try {
    if (!ADMIN_MNEMONIC) {
      // Return empty list instead of 500 so UI can handle gracefully
      return NextResponse.json({
        adminAddresses: [],
        error: 'ADMIN_MNEMONIC not set',
      });
    }

    const hdPaths = Array.from({ length: NUM_ACCOUNTS }, (_, i) => [
      Slip10RawIndex.hardened(44),
      Slip10RawIndex.hardened(118),
      Slip10RawIndex.hardened(0),
      Slip10RawIndex.normal(0),
      Slip10RawIndex.normal(i),
    ]);

    const allAddresses: string[] = [];

    for (const prefix of PREFIXES) {
      try {
        const wallet = await DirectSecp256k1HdWallet.fromMnemonic(
          ADMIN_MNEMONIC,
          {
            prefix,
            hdPaths,
          }
        );
        const accounts = await wallet.getAccounts();
        for (const acc of accounts) {
          allAddresses.push(acc.address);
        }
      } catch (e) {
        // If mnemonic invalid, return empty list gracefully
        return NextResponse.json({
          adminAddresses: [],
          error: 'Invalid mnemonic format',
        });
      }
    }

    // Deduplicate
    const unique = Array.from(new Set(allAddresses));

    return NextResponse.json({ adminAddresses: unique });
  } catch (error: any) {
    console.error('Error getting admin addresses:', error);
    // Return empty list so admin UI falls back without blocking
    return NextResponse.json({
      adminAddresses: [],
      error: 'Failed to get admin addresses',
    });
  }
}
