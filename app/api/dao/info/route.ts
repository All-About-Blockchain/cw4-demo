import { NextRequest, NextResponse } from 'next/server';
import { CHAIN_CONFIG } from '../../../config/chain';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const daoAddress = searchParams.get('address');

    if (!daoAddress) {
      return NextResponse.json(
        { error: 'DAO address is required' },
        { status: 400 }
      );
    }

    console.log('Fetching DAO info for:', daoAddress);
    console.log('Using REST endpoint:', CHAIN_CONFIG.restEndpoint);

    // Query DAO info using separate queries for different data
    const [votingModuleResponse, proposalModulesResponse, adminResponse] =
      await Promise.all([
        fetch(
          `${CHAIN_CONFIG.restEndpoint}/cosmwasm/wasm/v1/contract/${daoAddress}/smart/${Buffer.from(JSON.stringify({ voting_module: {} })).toString('base64')}`
        ),
        fetch(
          `${CHAIN_CONFIG.restEndpoint}/cosmwasm/wasm/v1/contract/${daoAddress}/smart/${Buffer.from(JSON.stringify({ proposal_modules: {} })).toString('base64')}`
        ),
        fetch(
          `${CHAIN_CONFIG.restEndpoint}/cosmwasm/wasm/v1/contract/${daoAddress}/smart/${Buffer.from(JSON.stringify({ admin: {} })).toString('base64')}`
        ),
      ]);

    console.log('Voting module response status:', votingModuleResponse.status);
    console.log(
      'Proposal modules response status:',
      proposalModulesResponse.status
    );
    console.log('Admin response status:', adminResponse.status);

    if (!votingModuleResponse.ok || !proposalModulesResponse.ok) {
      throw new Error(
        `Failed to fetch DAO data: voting=${votingModuleResponse.status}, proposals=${proposalModulesResponse.status}`
      );
    }

    const votingModuleData = await votingModuleResponse.json();
    const proposalModulesData = await proposalModulesResponse.json();
    const adminData = adminResponse.ok
      ? await adminResponse.json()
      : { data: null };

    console.log(
      'Voting module data:',
      JSON.stringify(votingModuleData, null, 2)
    );
    console.log(
      'Proposal modules data:',
      JSON.stringify(proposalModulesData, null, 2)
    );
    console.log('Admin data:', JSON.stringify(adminData, null, 2));

    return NextResponse.json({
      name: 'DAO DAO',
      description: 'A governance DAO created with DAO DAO',
      voting_module: votingModuleData.data,
      proposal_modules: proposalModulesData.data || [],
      admin: adminData.data,
    });
  } catch (error: any) {
    console.error('Error fetching DAO info:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch DAO info',
        details: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
