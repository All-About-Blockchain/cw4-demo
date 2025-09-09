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
    const votingRegistryAdminType: 'address' | 'core_module' =
      body.votingRegistryAdminType || 'address';
    const votingRegistryAdminAddress: string =
      body.votingRegistryAdminAddress || '';

    // Validate label doesn't have leading/trailing whitespace
    if (label !== label.trim()) {
      return NextResponse.json(
        { error: 'Label cannot have leading or trailing whitespace' },
        { status: 400 }
      );
    }

    // Validate voting registry admin configuration
    if (
      votingRegistryAdminType === 'address' &&
      !votingRegistryAdminAddress.trim()
    ) {
      return NextResponse.json(
        {
          error:
            'Voting registry admin address is required when admin type is "address"',
        },
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
      votingRegistryAdminAddress,
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

    if (multisigType === 'fixed') {
      console.log('Creating fixed multisig...');
      const cw3FixedCodeId = CHAIN_CONFIG.contractCodes.cw3_fixed_multisig;
      console.log('CW3 fixed multisig code ID:', cw3FixedCodeId);

      if (!cw3FixedCodeId) {
        console.error('CW3 fixed multisig code ID not configured');
        return NextResponse.json(
          { error: 'CW3 fixed multisig code ID not configured for this chain' },
          { status: 500 }
        );
      }

      // Add back voting registry with core_module admin type
      const instantiateMsg = {
        name: label.trim(),
        description: description.trim(),
        voters: members.map(m => ({ addr: m.addr, weight: m.weight })),
        threshold: {
          absolute_percentage: { percentage: thresholdPercentage },
        },
        max_voting_period: { time: maxVotingSeconds },
        voting_registry_module_instantiate_info: {
          code_id: Number(CHAIN_CONFIG.contractCodes.voting_registry),
          msg: Buffer.from('{}').toString('base64'),
          admin: { core_module: {} },
          label: `${label.trim()}-voting-registry`,
        },
        proposal_modules_instantiate_info: [
          {
            code_id: Number(CHAIN_CONFIG.contractCodes.cw3_fixed_multisig),
            msg: Buffer.from(
              JSON.stringify({
                threshold: {
                  absolute_percentage: { percentage: thresholdPercentage },
                },
                max_voting_period: { time: maxVotingSeconds },
                allow_revoting: false,
              })
            ).toString('base64'),
            admin: { core_module: {} },
            label: `${label.trim()}-proposal-module`,
          },
        ],
      };

      console.log(
        'Fixed multisig instantiate message:',
        JSON.stringify(instantiateMsg, null, 2)
      );
      console.log('Instantiating contract with code ID:', cw3FixedCodeId);
      console.log('Contract code ID type:', typeof Number(cw3FixedCodeId));
      console.log('Contract code ID value:', Number(cw3FixedCodeId));

      // Generate unsigned transaction for Keplr signing
      const instantiateMsgBytes = toUtf8(JSON.stringify(instantiateMsg));
      const instantiateMsgBase64 =
        Buffer.from(instantiateMsgBytes).toString('base64');

      const msg = {
        typeUrl: '/cosmwasm.wasm.v1.MsgInstantiateContract',
        value: {
          sender: account.address,
          admin: '',
          codeId: Number(cw3FixedCodeId),
          label: label,
          msg: instantiateMsgBase64,
          funds: [],
        },
      };

      const fee = {
        amount: [],
        gas: '500000', // Set a reasonable gas limit
      };

      const memo = `Create ${multisigType} multisig: ${label}`;

      console.log('Generated unsigned transaction for Keplr signing');
      console.log('Message bytes length:', instantiateMsgBytes.length);
      console.log(
        'Message bytes (first 100 chars):',
        new TextDecoder().decode(instantiateMsgBytes.slice(0, 100))
      );

      return NextResponse.json({
        unsignedTx: {
          msgs: [msg],
          fee,
          memo,
          chainId: CHAIN_CONFIG.chainId,
          accountNumber: '0', // Will be fetched by Keplr
          sequence: '0', // Will be fetched by Keplr
        },
        type: 'fixed',
        instantiateMsg: instantiateMsg,
        debug: {
          instantiateMsgBytes: instantiateMsgBytes,
          instantiateMsgString: JSON.stringify(instantiateMsg),
        },
      });
    } else {
      console.log('Creating flex multisig...');
      // flex multisig: instantiate cw4-group first, then cw3-flex with group_addr
      const cw4GroupCodeId = CHAIN_CONFIG.contractCodes.cw4_group;
      const cw3FlexCodeId = CHAIN_CONFIG.contractCodes.cw3_flex_multisig;

      console.log('Contract code IDs:', {
        cw4GroupCodeId,
        cw3FlexCodeId,
      });

      if (!cw4GroupCodeId || !cw3FlexCodeId) {
        console.error('Missing contract code IDs for flex multisig');
        return NextResponse.json(
          {
            error:
              'CW4 group and CW3 flex multisig code IDs must be configured for this chain',
          },
          { status: 500 }
        );
      }

      // cw4-group instantiate message
      const groupMsg = {
        name: label.trim(),
        description: `${description} - Group Contract`,
        admin: account.address,
        members: members.map(m => ({ addr: m.addr, weight: m.weight })),
      };
      const groupLabel = `${label.trim()}-group`;

      console.log(
        'CW4 group instantiate message:',
        JSON.stringify(groupMsg, null, 2)
      );
      console.log('Instantiating CW4 group with code ID:', cw4GroupCodeId);

      const { contractAddress: groupAddress } = await client.instantiate(
        account.address,
        Number(cw4GroupCodeId),
        groupMsg as any,
        groupLabel,
        'auto',
        { admin: '' } // Empty admin like in the Injective example
      );

      console.log('CW4 group created successfully:', groupAddress);

      // cw3-flex instantiate
      const flexMsg = {
        name: label.trim(),
        description,
        group_addr: groupAddress,
        threshold: { absolute_percentage: { percentage: thresholdPercentage } },
        max_voting_period: { time: maxVotingSeconds },
        voting_registry_module_instantiate_info: {
          code_id: Number(CHAIN_CONFIG.contractCodes.voting_registry),
          msg: Buffer.from('{}').toString('base64'), // Base64 encoded empty message
          admin:
            votingRegistryAdminType === 'address'
              ? {
                  address: votingRegistryAdminAddress.trim() || account.address,
                }
              : { core_module: {} },
          label: `${label.trim()}-voting-registry`,
        },
      };

      console.log(
        'CW3 flex instantiate message:',
        JSON.stringify(flexMsg, null, 2)
      );
      console.log('Instantiating CW3 flex with code ID:', cw3FlexCodeId);

      const { contractAddress: multisigAddress } = await client.instantiate(
        account.address,
        Number(cw3FlexCodeId),
        flexMsg as any,
        label,
        'auto',
        { admin: '' } // Empty admin like in the Injective example
      );

      console.log('Flex multisig created successfully:', multisigAddress);
      return NextResponse.json({
        address: multisigAddress,
        groupAddress,
        type: 'flex',
      });
    }
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
