import { NextResponse } from 'next/server';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';

const ADMIN_MNEMONIC = process.env.ADMIN_MNEMONIC!;

export async function GET() {
  try {
    if (!ADMIN_MNEMONIC) {
      return NextResponse.json(
        { error: 'Admin mnemonic not configured' },
        { status: 500 }
      );
    }

    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(ADMIN_MNEMONIC, {
      prefix: 'juno',
    });
    const [account] = await wallet.getAccounts();

    return NextResponse.json({ adminAddress: account.address });
  } catch (error: any) {
    console.error('Error getting admin address:', error);
    return NextResponse.json(
      { error: 'Failed to get admin address' },
      { status: 500 }
    );
  }
}
