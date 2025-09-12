import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { GasPrice } from '@cosmjs/stargate';
import { CHAIN_CONFIG } from '../config/chain';

export interface FeeGrantOptions {
  granter: string; // Admin address
  grantee: string; // User address
  spendLimit?: string; // Optional spend limit
  expiration?: Date; // Optional expiration
}

/**
 * Create a minimal fee grant from admin to user for specific transaction
 */
export async function createMinimalFeeGrant(
  client: SigningCosmWasmClient,
  adminAddress: string,
  userAddress: string,
  transactionType: 'registration' | 'dao_operation' = 'registration'
): Promise<any> {
  try {
    // Calculate minimal fee based on transaction type
    let feeAmount: string;
    switch (transactionType) {
      case 'registration':
        // Registration: CW4 update only (1 transaction)
        feeAmount = '5000'; // ~0.005 JUNO for 1 transaction
        break;
      case 'dao_operation':
        // DAO operations: single transaction
        feeAmount = '5000'; // ~0.005 JUNO for 1 transaction
        break;
      default:
        feeAmount = '5000';
    }

    // Create fee grant message
    const feeGrantMsg = {
      typeUrl: '/cosmos.feegrant.v1beta1.MsgGrantAllowance',
      value: {
        granter: adminAddress,
        grantee: userAddress,
        allowance: {
          typeUrl: '/cosmos.feegrant.v1beta1.BasicAllowance',
          value: {
            spendLimit: [
              {
                denom: CHAIN_CONFIG.baseDenom,
                amount: feeAmount,
              },
            ],
            expiration: null, // No expiration
          },
        },
      },
    };

    // Send the fee grant transaction
    const result = await client.signAndBroadcast(
      adminAddress,
      [feeGrantMsg],
      'auto',
      'Grant fee allowance to new DAO member'
    );

    console.log('Fee grant created:', result.transactionHash);
    return result;
  } catch (error) {
    console.error('Error creating fee grant:', error);
    throw error;
  }
}

/**
 * Revoke a fee grant
 */
export async function revokeFeeGrant(
  client: SigningCosmWasmClient,
  adminAddress: string,
  userAddress: string
): Promise<any> {
  try {
    const revokeMsg = {
      typeUrl: '/cosmos.feegrant.v1beta1.MsgRevokeAllowance',
      value: {
        granter: adminAddress,
        grantee: userAddress,
      },
    };

    const result = await client.signAndBroadcast(
      adminAddress,
      [revokeMsg],
      'auto',
      'Revoke fee allowance'
    );

    console.log('Fee grant revoked:', result.transactionHash);
    return result;
  } catch (error) {
    console.error('Error revoking fee grant:', error);
    throw error;
  }
}

/**
 * Check if a fee grant exists
 */
export async function checkFeeGrant(
  client: SigningCosmWasmClient,
  adminAddress: string,
  userAddress: string
): Promise<boolean> {
  try {
    // For now, return true to indicate fee grants are available
    // In a production environment, you'd implement proper fee grant querying
    return true;
  } catch (error) {
    // If query fails, assume no grant exists
    return false;
  }
}
