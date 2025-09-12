import { NextRequest, NextResponse } from 'next/server';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { GasPrice } from '@cosmjs/stargate';
import { CHAIN_CONFIG } from '../../../config/chain';
import { getValidatedContractAddresses } from '../../../config/contracts';

const ADMIN_MNEMONIC = process.env.ADMIN_MNEMONIC!;
const CW4_ADDR = process.env.CW4_ADDR!;

export async function POST(request: NextRequest) {
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
    const [account] = await wallet.getAccounts();

    const client = await SigningCosmWasmClient.connectWithSigner(
      CHAIN_CONFIG.rpcEndpoint,
      wallet,
      {
        gasPrice: GasPrice.fromString(CHAIN_CONFIG.gasPrice),
      }
    );

    // Use the existing CW4 group contract address from centralized configuration
    const contracts = getValidatedContractAddresses();
    const existingCw4GroupAddress = contracts.cw4Group;

    console.log('Using existing CW4 Group Contract:', existingCw4GroupAddress);

    // Step 1: Verify the CW4 group contract exists and is accessible
    try {
      const cw4GroupInfo = await client.queryContractSmart(
        existingCw4GroupAddress,
        {
          group_contract: {},
        }
      );
      console.log('CW4 Group Info:', JSON.stringify(cw4GroupInfo, null, 2));
    } catch (error) {
      console.warn(
        'Could not query CW4 group info, but continuing with configuration'
      );
    }

    // Step 2: Update DAO to use the existing CW4 group as voting module
    const updateVotingModuleMsg = {
      update_voting_module: {
        voting_module: existingCw4GroupAddress,
      },
    };

    await client.execute(
      account.address,
      CW4_ADDR,
      updateVotingModuleMsg,
      'auto'
    );

    console.log('DAO voting module updated successfully');

    return NextResponse.json({
      success: true,
      cw4GroupAddress: existingCw4GroupAddress,
      message:
        'DAO configured with existing CW4 group voting module successfully',
    });
  } catch (error: any) {
    console.error('DAO configuration error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to configure DAO' },
      { status: 500 }
    );
  }
}
