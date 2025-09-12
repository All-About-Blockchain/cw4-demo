import { NextRequest, NextResponse } from 'next/server';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { GasPrice } from '@cosmjs/stargate';
import { CHAIN_CONFIG, ADMIN_CONFIG } from '../../config/chain';
import { getValidatedContractAddresses } from '../../config/contracts';
import { createMinimalFeeGrant } from '../../utils/feeGrant';

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
      console.error('Missing environment variables:', {
        ADMIN_MNEMONIC: !!ADMIN_MNEMONIC,
        CW4_ADDR: !!CW4_ADDR,
      });
      return NextResponse.json(
        {
          error:
            'Server configuration missing. Please check ADMIN_MNEMONIC and CW4_ADDR environment variables.',
        },
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

    // 1. Create minimal fee grant for user registration
    try {
      await createMinimalFeeGrant(
        client,
        account.address,
        address,
        'registration' // Minimal fee for registration transactions
      );
      console.log('Minimal fee grant created for user registration:', address);
    } catch (error) {
      console.warn(
        'Fee grant creation failed, continuing with DAO registration:',
        error
      );
    }

    // 2. Create a proposal to add user to CW4 group (DAO DAO style)
    const contracts = getValidatedContractAddresses();
    const cw4GroupAddress = contracts.cw4Group;
    const proposalContractAddress = contracts.proposal;

    console.log('Creating proposal to add user to CW4 group:', {
      cw4GroupAddress: cw4GroupAddress,
      proposalContract: proposalContractAddress,
      userAddress: address,
      adminAddress: account.address,
    });

    // 3. Create proposal with member addition message
    const proposalMsg = {
      propose: {
        msg: {
          propose: {
            title: `Add ${address}`,
            description: `Add ${address} to the DAO`,
            msgs: [
              {
                wasm: {
                  execute: {
                    contract_addr: cw4GroupAddress,
                    funds: [],
                    msg: {
                      update_members: {
                        add: [
                          { addr: address, weight: ADMIN_CONFIG.memberWeight },
                        ],
                        remove: [],
                      },
                    },
                  },
                },
              },
            ],
            vote: {
              vote: 'yes',
            },
          },
        },
      },
    };

    await client.execute(
      account.address,
      proposalContractAddress,
      proposalMsg,
      'auto'
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
