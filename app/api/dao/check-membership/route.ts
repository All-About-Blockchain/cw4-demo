import { NextRequest, NextResponse } from 'next/server';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { GasPrice } from '@cosmjs/stargate';
import { CHAIN_CONFIG } from '../../../config/chain';

const ADMIN_MNEMONIC = process.env.ADMIN_MNEMONIC!;
const CW4_ADDR = process.env.CW4_ADDR!;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }

    if (!ADMIN_MNEMONIC || !CW4_ADDR) {
      console.error('Missing environment variables:', {
        ADMIN_MNEMONIC: !!ADMIN_MNEMONIC,
        CW4_ADDR: !!CW4_ADDR,
      });
      return NextResponse.json(
        {
          error:
            'Server configuration missing. Please check ADMIN_MNEMONIC and CW4_ADDR environment variables.',
          isMember: false,
          totalMembers: 0,
        },
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

    // Use the specific CW4 group contract address for membership checks
    const cw4GroupAddress =
      'juno1mugyuzerl90g4c9s8vgt0d0w5dj3xxd9kp8j05kehdncvm43wt2s5agn3f';

    console.log('Checking membership in CW4 group:', {
      cw4GroupAddress: cw4GroupAddress,
      userAddress: address,
    });

    // Query the CW4 group for members
    const queryMsg = {
      list_members: {},
    };

    const result = await client.queryContractSmart(cw4GroupAddress, queryMsg);
    const members = result.members || [];

    // Check if the address is in the members list
    const isMember = members.some((member: any) => member.addr === address);
    const memberInfo = members.find((member: any) => member.addr === address);

    return NextResponse.json({
      isMember,
      memberInfo: memberInfo || null,
      totalMembers: members.length,
    });
  } catch (error: any) {
    console.error('Error checking DAO membership:', error);
    return NextResponse.json(
      { error: 'Failed to check DAO membership' },
      { status: 500 }
    );
  }
}
