import { NextResponse } from 'next/server';
import { CHAIN_CONFIG } from '../../../config/chain';

export async function GET() {
  try {
    console.log('Checking deployed contracts on:', CHAIN_CONFIG.chainId);
    console.log('Using REST endpoint:', CHAIN_CONFIG.restEndpoint);

    // Query the REST endpoint for deployed contracts
    const response = await fetch(
      `${CHAIN_CONFIG.restEndpoint}/cosmwasm/wasm/v1/code`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `HTTP error! status: ${response.status} - ${response.statusText}`
      );
    }

    const data = await response.json();

    console.log('Deployed contracts response:', data);

    // Extract code IDs and their info
    const contracts =
      data.code_infos?.map((code: any) => ({
        code_id: code.code_id,
        creator: code.creator,
        data_hash: code.data_hash,
        instantiate_permission: code.instantiate_permission,
      })) || [];

    return NextResponse.json({
      chainId: CHAIN_CONFIG.chainId,
      restEndpoint: CHAIN_CONFIG.restEndpoint,
      totalContracts: contracts.length,
      contracts: contracts,
      rawResponse: data,
    });
  } catch (error: any) {
    console.error('Error checking contracts:', error);
    return NextResponse.json(
      {
        error: 'Failed to check contracts',
        details: error.message,
        chainId: CHAIN_CONFIG.chainId,
        restEndpoint: CHAIN_CONFIG.restEndpoint,
      },
      { status: 500 }
    );
  }
}
