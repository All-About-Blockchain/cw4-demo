import { NextRequest, NextResponse } from 'next/server';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { GasPrice } from '@cosmjs/stargate';
import { toUtf8 } from '@cosmjs/encoding';
import { CHAIN_CONFIG } from '../../../config/chain';

const ADMIN_MNEMONIC = process.env.ADMIN_MNEMONIC!;

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
    console.log('=== CREATE MULTISIG REQUEST START ===');

    if (!ADMIN_MNEMONIC) {
      console.error('ADMIN_MNEMONIC not configured');
      return NextResponse.json(
        { error: 'ADMIN_MNEMONIC not configured' },
        { status: 500 }
      );
    }

    console.log('Chain config:', {
      chainId: CHAIN_CONFIG.chainId,
      prefix: CHAIN_CONFIG.prefix,
      contractCodes: CHAIN_CONFIG.contractCodes,
    });

    const body = await req.json().catch(error => {
      console.error('Failed to parse request body:', error);
      return {} as any;
    });

    console.log('Request body:', JSON.stringify(body, null, 2));

    const members: Array<{ addr: string; weight: number }> = body.members || [];
    const thresholdPercentage: string = body.thresholdPercentage || '0.5';
    const maxVotingSeconds: number = body.maxVotingSeconds || 7 * 24 * 60 * 60; // 7 days
    const label: string = (body.label || `cw3-fixed-${Date.now()}`).trim();
    const description: string =
      body.description || `A ${body.type || 'fixed'} multisig contract`;
    // Default to core_module for voting registry admin
    const votingRegistryAdminType: 'address' | 'core_module' = 'core_module';

    // Validate label doesn't have leading/trailing whitespace
    if (label !== label.trim()) {
      return NextResponse.json(
        { error: 'Label cannot have leading or trailing whitespace' },
        { status: 400 }
      );
    }
    const multisigType: 'fixed' | 'flex' =
      body.type === 'flex' ? 'flex' : 'fixed';

    console.log('Parsed parameters:', {
      members,
      thresholdPercentage,
      maxVotingSeconds,
      label,
      description,
      votingRegistryAdminType,
      multisigType,
    });

    if (!Array.isArray(members) || members.length === 0) {
      console.error('Invalid members array:', members);
      return NextResponse.json(
        { error: 'members array is required and must not be empty' },
        { status: 400 }
      );
    }

    // Validate member structure
    for (let i = 0; i < members.length; i++) {
      const member = members[i];
      if (!member.addr || typeof member.addr !== 'string') {
        console.error(`Invalid member at index ${i}:`, member);
        return NextResponse.json(
          { error: `Member at index ${i} must have a valid addr string` },
          { status: 400 }
        );
      }
      if (typeof member.weight !== 'number' || member.weight <= 0) {
        console.error(`Invalid weight for member at index ${i}:`, member);
        return NextResponse.json(
          { error: `Member at index ${i} must have a positive weight number` },
          { status: 400 }
        );
      }
    }

    console.log('Creating wallet with prefix:', CHAIN_CONFIG.prefix);
    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(ADMIN_MNEMONIC, {
      prefix: CHAIN_CONFIG.prefix,
    });
    const [account] = await wallet.getAccounts();
    console.log('Admin account address:', account.address);

    console.log('Connecting to RPC endpoint:', CHAIN_CONFIG.rpcEndpoint);

    // Try to connect with timeout
    const client = (await Promise.race([
      SigningCosmWasmClient.connectWithSigner(
        CHAIN_CONFIG.rpcEndpoint,
        wallet,
        { gasPrice: GasPrice.fromString(CHAIN_CONFIG.gasPrice) }
      ),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('Connection timeout after 30 seconds')),
          30000
        )
      ),
    ])) as SigningCosmWasmClient;

    console.log('Connected to chain successfully');

    // Create DAO Core (replacing both fixed and flex multisig)
    console.log('Creating DAO Core...');
    const daoCoreCodeId = CHAIN_CONFIG.contractCodes.dao_core;
    console.log('DAO Core code ID:', daoCoreCodeId);

    if (!daoCoreCodeId) {
      console.error('DAO Core code ID not configured');
      return NextResponse.json(
        { error: 'DAO Core code ID not configured for this chain' },
        { status: 500 }
      );
    }

    // DAO Core instantiate message based on the provided example
    const instantiateMsg = {
      admin: null,
      automatically_add_cw20s: true,
      automatically_add_cw721s: true,
      description: description,
      image_url: 'ipfs://QmPWgRemzjESJo4FUwL7Su6V25Nqgx3ipfpfNo4umb7zF3',
      name: label,
      proposal_modules_instantiate_info: [
        {
          admin: {
            core_module: {},
          },
          code_id: Number(CHAIN_CONFIG.contractCodes.dao_proposal_single),
          label: `dao-proposal-single_${Date.now()}`,
          msg: {
            allow_revoting: false,
            close_proposal_on_execution_failure: true,
            max_voting_period: {
              time: maxVotingSeconds,
            },
            only_members_execute: true,
            pre_propose_info: {
              module_may_propose: {
                info: {
                  admin: {
                    core_module: {},
                  },
                  code_id: Number(
                    CHAIN_CONFIG.contractCodes.dao_pre_propose_single
                  ),
                  label: `dao-pre-propose-single_${Date.now()}`,
                  msg: {
                    deposit_info: null,
                    submission_policy: {
                      specific: {
                        dao_members: true,
                        allowlist: [],
                        denylist: [],
                      },
                    },
                    extension: {},
                  },
                  funds: [],
                },
              },
            },
            threshold: {
              threshold_quorum: {
                quorum: {
                  percent: thresholdPercentage,
                },
                threshold: {
                  majority: {},
                },
              },
            },
            veto: null,
          },
          funds: [],
        },
      ],
      voting_module_instantiate_info: {
        admin: {
          core_module: {},
        },
        code_id: Number(CHAIN_CONFIG.contractCodes.dao_voting_cw4),
        label: `dao-voting-cw4_${Date.now()}`,
        msg: {
          group_contract: {
            new: {
              cw4_group_code_id: Number(CHAIN_CONFIG.contractCodes.cw4_group),
              initial_members: members.map(m => ({
                addr: m.addr,
                weight: m.weight * 1000, // Scale weights for better precision
              })),
            },
          },
        },
        funds: [],
      },
    };

    console.log(
      'DAO Core instantiate message:',
      JSON.stringify(instantiateMsg, null, 2)
    );
    console.log('Instantiating contract with code ID:', daoCoreCodeId);

    // Generate unsigned transaction for Keplr signing
    const instantiateMsgBytes = toUtf8(JSON.stringify(instantiateMsg));
    const instantiateMsgBase64 =
      Buffer.from(instantiateMsgBytes).toString('base64');

    const msg = {
      typeUrl: '/cosmwasm.wasm.v1.MsgInstantiateContract',
      value: {
        sender: account.address,
        admin: '',
        codeId: Number(daoCoreCodeId),
        label: label,
        msg: instantiateMsgBase64,
        funds: [],
      },
    };

    const fee = {
      amount: [],
      gas: '1000000', // Higher gas limit for DAO creation
    };

    const memo = `Create DAO: ${label}`;

    console.log('Generated unsigned transaction for Keplr signing');
    console.log('Message bytes length:', instantiateMsgBytes.length);

    return NextResponse.json({
      unsignedTx: {
        msgs: [msg],
        fee,
        memo,
        chainId: CHAIN_CONFIG.chainId,
        accountNumber: '0', // Will be fetched by Keplr
        sequence: '0', // Will be fetched by Keplr
      },
      type: 'dao',
      instantiateMsg: instantiateMsg,
      debug: {
        instantiateMsgBytes: instantiateMsgBytes,
        instantiateMsgString: JSON.stringify(instantiateMsg),
      },
    });
  } catch (e: any) {
    console.error('=== CREATE MULTISIG ERROR ===');
    console.error('Error type:', typeof e);
    console.error('Error message:', e?.message);
    console.error('Error stack:', e?.stack);
    console.error('Full error object:', e);

    // Check if it's a network connectivity error
    if (
      e?.message?.includes('fetch failed') ||
      e?.message?.includes('ENOTFOUND') ||
      e?.message?.includes('timeout')
    ) {
      return NextResponse.json(
        {
          error: `Network error: Unable to connect to ${CHAIN_CONFIG.chainId} RPC endpoint. Please check your internet connection or try switching to a different chain.`,
          details: e?.message,
        },
        { status: 503 }
      );
    }

    // Check if it's a validation error (400)
    if (
      e?.message?.includes('validation') ||
      e?.message?.includes('invalid') ||
      e?.message?.includes('required')
    ) {
      return NextResponse.json(
        { error: e.message || 'Validation error' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: e?.message || 'Failed to create multisig' },
      { status: 500 }
    );
  }
}
