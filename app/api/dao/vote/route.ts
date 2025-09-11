import { NextRequest, NextResponse } from 'next/server';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { GasPrice } from '@cosmjs/stargate';
import { toUtf8 } from '@cosmjs/encoding';
import { CHAIN_CONFIG } from '../../../config/chain';

const ADMIN_MNEMONIC = process.env.ADMIN_MNEMONIC!;

export async function POST(req: NextRequest) {
  try {
    console.log('=== VOTE ON PROPOSAL REQUEST START ===');

    if (!ADMIN_MNEMONIC) {
      console.error('ADMIN_MNEMONIC not configured');
      return NextResponse.json(
        { error: 'ADMIN_MNEMONIC not configured' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { daoAddress, proposalId, vote } = body;

    console.log('Vote request:', { daoAddress, proposalId, vote });

    if (!daoAddress || !proposalId || !vote) {
      return NextResponse.json(
        { error: 'daoAddress, proposalId, and vote are required' },
        { status: 400 }
      );
    }

    const validVotes = ['yes', 'no', 'abstain', 'veto'];
    if (!validVotes.includes(vote)) {
      return NextResponse.json(
        { error: `Invalid vote. Must be one of: ${validVotes.join(', ')}` },
        { status: 400 }
      );
    }

    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(ADMIN_MNEMONIC, {
      prefix: CHAIN_CONFIG.prefix,
    });
    const [account] = await wallet.getAccounts();
    console.log('Voter account:', account.address);

    const client = await SigningCosmWasmClient.connectWithSigner(
      CHAIN_CONFIG.rpcEndpoint,
      wallet,
      { gasPrice: GasPrice.fromString(CHAIN_CONFIG.gasPrice) }
    );

    // First, get proposal modules
    const proposalModulesResponse = await fetch(
      `${CHAIN_CONFIG.restEndpoint}/cosmwasm/wasm/v1/contract/${daoAddress}/smart/${Buffer.from(JSON.stringify({ proposal_modules: {} })).toString('base64')}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      }
    );

    if (!proposalModulesResponse.ok) {
      throw new Error(
        `Failed to fetch proposal modules: ${proposalModulesResponse.status}`
      );
    }

    const proposalModulesData = await proposalModulesResponse.json();
    const proposalModules = proposalModulesData.data || [];

    if (proposalModules.length === 0) {
      return NextResponse.json(
        { error: 'No proposal modules found for this DAO' },
        { status: 400 }
      );
    }

    // Find the proposal in any of the modules
    let proposalModule = null;
    let foundProposal = null;

    for (const module of proposalModules) {
      try {
        const proposalResponse = await fetch(
          `${CHAIN_CONFIG.restEndpoint}/cosmwasm/wasm/v1/contract/${module.address}/smart/${Buffer.from(JSON.stringify({ proposal: { proposal_id: proposalId } })).toString('base64')}`,
          {
            method: 'GET',
            headers: {
              Accept: 'application/json',
            },
          }
        );

        if (proposalResponse.ok) {
          const proposalData = await proposalResponse.json();
          if (proposalData.data) {
            proposalModule = module.address;
            foundProposal = proposalData.data;
            break;
          }
        }
      } catch (err) {
        console.error(
          'Error checking proposal in module:',
          module.address,
          err
        );
      }
    }

    if (!proposalModule || !foundProposal) {
      return NextResponse.json(
        { error: 'Proposal not found' },
        { status: 404 }
      );
    }

    console.log('Found proposal in module:', proposalModule);

    // Create vote message
    const voteMsg = {
      vote: {
        proposal_id: proposalId,
        vote,
      },
    };

    // Generate unsigned transaction for Keplr signing
    const voteMsgBytes = toUtf8(JSON.stringify(voteMsg));
    const voteMsgBase64 = Buffer.from(voteMsgBytes).toString('base64');

    const msg = {
      typeUrl: '/cosmwasm.wasm.v1.MsgExecuteContract',
      value: {
        sender: account.address,
        contract: proposalModule,
        msg: voteMsgBase64,
        funds: [],
      },
    };

    const fee = {
      amount: [],
      gas: '300000',
    };

    const memo = `Vote ${vote} on proposal ${proposalId}`;

    console.log('Generated unsigned vote transaction');

    return NextResponse.json({
      unsignedTx: {
        msgs: [msg],
        fee,
        memo,
        chainId: CHAIN_CONFIG.chainId,
        accountNumber: '0',
        sequence: '0',
      },
      type: 'vote',
      voteMsg: voteMsg,
      debug: {
        proposalModule,
        voteMsgBytes: voteMsgBytes,
        voteMsgString: JSON.stringify(voteMsg),
      },
    });
  } catch (error: any) {
    console.error('=== VOTE ERROR ===');
    console.error('Error type:', typeof error);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
    console.error('Full error object:', error);

    return NextResponse.json(
      { error: error?.message || 'Failed to create vote transaction' },
      { status: 500 }
    );
  }
}
