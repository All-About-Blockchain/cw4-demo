import { NextRequest, NextResponse } from 'next/server';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { GasPrice } from '@cosmjs/stargate';
import { CHAIN_CONFIG } from '../../../config/chain';

const ADMIN_MNEMONIC = process.env.ADMIN_MNEMONIC!;
const CW3_FIXED_CODE_ID = process.env.CW3_FIXED_CODE_ID; // required to instantiate cw3-fixed-multisig
const CW3_FLEX_CODE_ID = process.env.CW3_FLEX_CODE_ID; // required to instantiate cw3-flex-multisig
const CW4_GROUP_CODE_ID = process.env.CW4_GROUP_CODE_ID; // required to instantiate cw4-group for flex

// Expected body:
// {
//   label?: string,
//   members: [{ addr: string, weight: number }],
//   thresholdPercentage?: string, // Decimal string like '0.5' for 50%
//   maxVotingSeconds?: number // default 7 days
//   type?: 'fixed' | 'flex' // default 'fixed'
// }

export async function POST(req: NextRequest) {
  try {
    if (!ADMIN_MNEMONIC) {
      return NextResponse.json(
        { error: 'ADMIN_MNEMONIC not configured' },
        { status: 500 }
      );
    }
    const body = await req.json().catch(() => ({}) as any);
    const members: Array<{ addr: string; weight: number }> = body.members || [];
    const thresholdPercentage: string = body.thresholdPercentage || '0.5';
    const maxVotingSeconds: number = body.maxVotingSeconds || 7 * 24 * 60 * 60; // 7 days
    const label: string = body.label || `cw3-fixed-${Date.now()}`;
    const multisigType: 'fixed' | 'flex' =
      body.type === 'flex' ? 'flex' : 'fixed';

    if (!Array.isArray(members) || members.length === 0) {
      return NextResponse.json(
        { error: 'members array is required' },
        { status: 400 }
      );
    }

    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(ADMIN_MNEMONIC, {
      prefix: CHAIN_CONFIG.prefix,
    });
    const [account] = await wallet.getAccounts();

    const client = await SigningCosmWasmClient.connectWithSigner(
      CHAIN_CONFIG.rpcEndpoint,
      wallet,
      { gasPrice: GasPrice.fromString(CHAIN_CONFIG.gasPrice) }
    );

    if (multisigType === 'fixed') {
      if (!CW3_FIXED_CODE_ID) {
        return NextResponse.json(
          { error: 'CW3_FIXED_CODE_ID not configured on server' },
          { status: 500 }
        );
      }
      const instantiateMsg = {
        voters: members.map(m => ({ addr: m.addr, weight: m.weight })),
        threshold: {
          absolute_percentage: { percentage: thresholdPercentage },
        },
        max_voting_period: { time: maxVotingSeconds },
      };
      const { contractAddress } = await client.instantiate(
        account.address,
        Number(CW3_FIXED_CODE_ID),
        instantiateMsg as any,
        label,
        'auto',
        { admin: account.address }
      );
      return NextResponse.json({ address: contractAddress, type: 'fixed' });
    } else {
      // flex multisig: instantiate cw4-group first, then cw3-flex with group_addr
      if (!CW4_GROUP_CODE_ID || !CW3_FLEX_CODE_ID) {
        return NextResponse.json(
          {
            error:
              'CW4_GROUP_CODE_ID and CW3_FLEX_CODE_ID must be configured for flex multisig',
          },
          { status: 500 }
        );
      }
      // cw4-group instantiate message
      const groupMsg = {
        admin: account.address,
        members: members.map(m => ({ addr: m.addr, weight: m.weight })),
      };
      const groupLabel = `${label}-group`;
      const { contractAddress: groupAddress } = await client.instantiate(
        account.address,
        Number(CW4_GROUP_CODE_ID),
        groupMsg as any,
        groupLabel,
        'auto',
        { admin: account.address }
      );

      // cw3-flex instantiate
      const flexMsg = {
        group_addr: groupAddress,
        threshold: { absolute_percentage: { percentage: thresholdPercentage } },
        max_voting_period: { time: maxVotingSeconds },
      };
      const { contractAddress: multisigAddress } = await client.instantiate(
        account.address,
        Number(CW3_FLEX_CODE_ID),
        flexMsg as any,
        label,
        'auto',
        { admin: account.address }
      );

      return NextResponse.json({
        address: multisigAddress,
        groupAddress,
        type: 'flex',
      });
    }
  } catch (e: any) {
    console.error('create-multisig error', e);
    return NextResponse.json(
      { error: e?.message || 'Failed to create multisig' },
      { status: 500 }
    );
  }
}
