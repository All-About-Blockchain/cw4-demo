import { NextRequest, NextResponse } from 'next/server';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { GasPrice } from '@cosmjs/stargate';
import { CHAIN_CONFIG, ADMIN_CONFIG } from '../../config/chain';

const ADMIN_MNEMONIC = process.env.ADMIN_MNEMONIC!;
const CW4_ADDR = process.env.CW4_ADDR!;

export async function POST(request: NextRequest) {
  if (request.method !== 'POST') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const { address } = await request.json();

    if (!address) {
      return NextResponse.json({ error: 'No address' }, { status: 400 });
    }

    if (!ADMIN_MNEMONIC || !CW4_ADDR) {
      return NextResponse.json(
        { error: 'Server configuration missing' },
        { status: 500 }
      );
    }

    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(ADMIN_MNEMONIC, {
      prefix: CHAIN_CONFIG.prefix,
    });
    const [account] = await wallet.getAccounts();

    const client = await SigningCosmWasmClient.connectWithSigner(
      CHAIN_CONFIG.rpcEndpoint,
      wallet,
      {
        gasPrice: GasPrice.fromString(CHAIN_CONFIG.gasPrice),
      }
    );

    // 1. Fund user
    await client.sendTokens(
      account.address,
      address,
      [{ denom: CHAIN_CONFIG.baseDenom, amount: ADMIN_CONFIG.fundingAmount }],
      'auto'
    );

    // 2. Add user to CW4 group
    const msg = {
      update_members: {
        add: [{ addr: address, weight: ADMIN_CONFIG.memberWeight }],
        remove: [],
      },
    };
    await client.execute(account.address, CW4_ADDR, msg, 'auto');

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
