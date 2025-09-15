import { NextRequest, NextResponse } from 'next/server';
import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { GasPrice } from '@cosmjs/stargate';
import { CHAIN_CONFIG } from '../../../config/chain';
import { getValidatedContractAddresses } from '../../../config/contracts';
import { createMinimalFeeGrant } from '../../../utils/feeGrant';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, description, messages, daoAddress } = body;

    if (!title || !description || !messages || !daoAddress) {
      return NextResponse.json(
        { error: 'Title, description, messages, and DAO address are required' },
        { status: 400 }
      );
    }

    // Get admin account for signing
    const mnemonic = process.env.ADMIN_MNEMONIC;
    if (!mnemonic) {
      throw new Error('Admin mnemonic not configured');
    }

    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
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

    // Create minimal fee grant for proposal creation
    try {
      await createMinimalFeeGrant(
        client,
        account.address,
        account.address, // Self-grant for admin operations
        'dao_operation'
      );
      console.log('Minimal fee grant created for proposal creation');
    } catch (error) {
      console.warn(
        'Fee grant creation failed, continuing with proposal creation:',
        error
      );
    }

    // Get contract addresses
    const contracts = getValidatedContractAddresses();
    const proposalContractAddress = contracts.proposal;

    console.log('Creating proposal:', {
      title,
      description,
      proposalContract: proposalContractAddress,
      adminAddress: account.address,
      messageCount: messages.length,
    });

    // Create proposal message - simple text proposal with no execution messages
    const proposalMsg = {
      propose: {
        msg: {
          propose: {
            title,
            description,
            msgs: [], // Empty messages array for text-only proposals
            vote: {
              vote: 'yes', // Admin votes yes by default
            },
          },
        },
      },
    };

    const result = await client.execute(
      account.address,
      proposalContractAddress,
      proposalMsg,
      'auto'
    );

    console.log('Proposal created successfully:', result.transactionHash);

    return NextResponse.json({
      success: true,
      transactionHash: result.transactionHash,
      proposalId: result.logs?.[0]?.events
        ?.find(e => e.type === 'wasm')
        ?.attributes?.find(a => a.key === 'proposal_id')?.value,
    });
  } catch (err: any) {
    console.error('Error creating proposal:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
