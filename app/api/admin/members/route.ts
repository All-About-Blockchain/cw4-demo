import { NextResponse } from 'next/server';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { GasPrice } from '@cosmjs/stargate';
import { CHAIN_CONFIG } from '../../../config/chain';

const ADMIN_MNEMONIC = process.env.ADMIN_MNEMONIC!;
const CW4_ADDR = process.env.CW4_ADDR!;

export async function GET() {
  try {
    if (!ADMIN_MNEMONIC || !CW4_ADDR) {
      return NextResponse.json(
        { error: 'Admin configuration missing' },
        { status: 500 }
      );
    }

    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(ADMIN_MNEMONIC, {
      prefix: CHAIN_CONFIG.prefix,
    });

    const client = await SigningCosmWasmClient.connectWithSigner(
      CHAIN_CONFIG.rpcEndpoint,
      wallet,
      {
        gasPrice: GasPrice.fromString(CHAIN_CONFIG.gasPrice),
      }
    );

    // Query the CW4 group for members
    const queryMsg = {
      list_members: {},
    };

    const result = await client.queryContractSmart(CW4_ADDR, queryMsg);

    return NextResponse.json({
      members: result.members || [],
      total: result.members?.length || 0,
    });
  } catch (error: any) {
    console.error('Error fetching group members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch group members' },
      { status: 500 }
    );
  }
}
