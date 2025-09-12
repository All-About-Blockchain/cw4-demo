import { NextRequest, NextResponse } from 'next/server';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { GasPrice } from '@cosmjs/stargate';
import { CHAIN_CONFIG } from '../../../config/chain';
import {
  createMinimalFeeGrant,
  revokeFeeGrant,
  checkFeeGrant,
} from '../../../utils/feeGrant';

const ADMIN_MNEMONIC = process.env.ADMIN_MNEMONIC!;

export async function POST(request: NextRequest) {
  try {
    const { action, userAddress, transactionType } = await request.json();

    if (!ADMIN_MNEMONIC) {
      return NextResponse.json(
        { error: 'Admin configuration missing' },
        { status: 500 }
      );
    }

    if (!userAddress) {
      return NextResponse.json(
        { error: 'User address is required' },
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
      {
        gasPrice: GasPrice.fromString(CHAIN_CONFIG.gasPrice),
      }
    );

    let result;

    switch (action) {
      case 'create':
        result = await createMinimalFeeGrant(
          client,
          account.address,
          userAddress,
          transactionType || 'dao_operation'
        );
        break;

      case 'revoke':
        result = await revokeFeeGrant(client, account.address, userAddress);
        break;

      case 'check':
        const exists = await checkFeeGrant(
          client,
          account.address,
          userAddress
        );
        return NextResponse.json({ exists });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: create, revoke, or check' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      transactionHash: result.transactionHash,
      action,
      userAddress,
    });
  } catch (error: any) {
    console.error('Fee grant management error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to manage fee grant' },
      { status: 500 }
    );
  }
}
