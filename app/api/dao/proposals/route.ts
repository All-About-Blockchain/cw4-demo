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

    console.log('Fetching proposals for DAO:', daoAddress);

    // First, get proposal modules
    const proposalModulesMsg = { proposal_modules: {} };
    const proposalModulesBase64 = Buffer.from(
      JSON.stringify(proposalModulesMsg)
    ).toString('base64');
    const proposalModulesUrl = `${CHAIN_CONFIG.restEndpoint}/cosmwasm/wasm/v1/contract/${daoAddress}/smart/${proposalModulesBase64}`;

    console.log('Proposal modules query URL:', proposalModulesUrl);

    const proposalModulesResponse = await fetch(proposalModulesUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!proposalModulesResponse.ok) {
      const errorText = await proposalModulesResponse.text();
      console.error('Proposal modules error response:', errorText);
      throw new Error(
        `Failed to fetch proposal modules: ${proposalModulesResponse.status} - ${errorText}`
      );
    }

    const proposalModulesData = await proposalModulesResponse.json();
    console.log(
      'Proposal modules data:',
      JSON.stringify(proposalModulesData, null, 2)
    );

    const proposalModules = proposalModulesData.data || [];

    console.log('Found proposal modules:', proposalModules.length);

    if (proposalModules.length === 0) {
      return NextResponse.json({
        proposals: [],
      });
    }

    // Fetch proposals from each proposal module
    const allProposals: any[] = [];

    for (const module of proposalModules) {
      try {
        console.log('Fetching proposals from module:', module.address);

        // Query list proposals
        const listProposalsMsg = { list_proposals: {} };
        const listProposalsBase64 = Buffer.from(
          JSON.stringify(listProposalsMsg)
        ).toString('base64');
        const proposalsUrl = `${CHAIN_CONFIG.restEndpoint}/cosmwasm/wasm/v1/contract/${module.address}/smart/${listProposalsBase64}`;

        const proposalsResponse = await fetch(proposalsUrl, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
        });

        if (proposalsResponse.ok) {
          const proposalsData = await proposalsResponse.json();
          console.log(
            'Proposals data from module:',
            module.address,
            JSON.stringify(proposalsData, null, 2)
          );

          const proposals =
            proposalsData.data?.proposals || proposalsData.proposals || [];

          // Fetch detailed info for each proposal including votes
          for (const proposal of proposals) {
            try {
              // Get proposal details
              const proposalDetailMsg = {
                proposal: { proposal_id: proposal.id },
              };
              const proposalDetailBase64 = Buffer.from(
                JSON.stringify(proposalDetailMsg)
              ).toString('base64');
              const proposalDetailUrl = `${CHAIN_CONFIG.restEndpoint}/cosmwasm/wasm/v1/contract/${module.address}/smart/${proposalDetailBase64}`;

              const proposalDetailResponse = await fetch(proposalDetailUrl, {
                method: 'GET',
                headers: {
                  Accept: 'application/json',
                },
              });

              if (proposalDetailResponse.ok) {
                const proposalDetailData = await proposalDetailResponse.json();
                const proposalDetail =
                  proposalDetailData.data || proposalDetailData;

                allProposals.push({
                  ...proposalDetail,
                  module_address: module.address,
                });
              } else {
                console.error(
                  'Failed to fetch proposal details for proposal',
                  proposal.id
                );
              }
            } catch (err) {
              console.error('Error fetching proposal details:', err);
            }
          }
        } else {
          console.error(
            'Failed to fetch proposals from module:',
            module.address,
            proposalsResponse.status
          );
        }
      } catch (err) {
        console.error(
          'Error fetching proposals from module:',
          module.address,
          err
        );
      }
    }

    // Sort proposals by ID (newest first)
    allProposals.sort((a, b) => b.id - a.id);

    console.log('Fetched proposals:', allProposals.length);

    return NextResponse.json({
      proposals: allProposals,
    });
  } catch (error: any) {
    console.error('Error fetching proposals:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch proposals',
        details: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
