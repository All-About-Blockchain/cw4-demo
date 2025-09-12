/**
 * Centralized contract address configuration
 * All contract addresses are managed through environment variables
 * for universal deployment and easy management across environments
 */

export interface ContractConfig {
  daoCore: string;
  cw4Group: string;
  proposal: string;
  // Legacy support
  cw4Addr: string;
}

/**
 * Get contract addresses from environment variables
 * Supports both server-side (process.env) and client-side (NEXT_PUBLIC_) variables
 */
export function getContractAddresses(): ContractConfig {
  // Server-side environment variables (for API routes)
  const serverConfig = {
    daoCore: process.env.DAO_CORE_ADDR,
    cw4Group: process.env.CW4_GROUP_ADDR,
    proposal: process.env.DAO_PROPOSAL_ADDR,
    cw4Addr: process.env.CW4_ADDR,
  };

  // Client-side environment variables (for frontend components)
  const clientConfig = {
    daoCore: process.env.NEXT_PUBLIC_DAO_CORE_ADDR,
    cw4Group: process.env.NEXT_PUBLIC_CW4_GROUP_ADDR,
    proposal: process.env.NEXT_PUBLIC_DAO_PROPOSAL_ADDR,
    cw4Addr: process.env.NEXT_PUBLIC_CW4_ADDR,
  };

  // Fallback to default addresses if environment variables are not set
  const defaultConfig = {
    daoCore: 'juno185xlnz0zzsg2fl6njf7luwlmtj72qe3unqcj2vaxj7ze0ftdswuqkz4x4v',
    cw4Group: 'juno1mugyuzerl90g4c9s8vgt0d0w5dj3xxd9kp8j05kehdncvm43wt2s5agn3f',
    proposal: 'juno1l5mruy2p6apttcz2nrq4arvhw27j6k2hn5zvfz62jlw2khed7g7qe3p3cy',
    cw4Addr: 'juno1mugyuzerl90g4c9s8vgt0d0w5dj3xxd9kp8j05kehdncvm43wt2s5agn3f',
  };

  return {
    daoCore:
      serverConfig.daoCore || clientConfig.daoCore || defaultConfig.daoCore,
    cw4Group:
      serverConfig.cw4Group || clientConfig.cw4Group || defaultConfig.cw4Group,
    proposal:
      serverConfig.proposal || clientConfig.proposal || defaultConfig.proposal,
    cw4Addr:
      serverConfig.cw4Addr || clientConfig.cw4Addr || defaultConfig.cw4Addr,
  };
}

/**
 * Validate that all required contract addresses are configured
 */
export function validateContractConfig(): {
  isValid: boolean;
  missing: string[];
} {
  const contracts = getContractAddresses();
  const missing: string[] = [];

  if (!contracts.daoCore) missing.push('DAO_CORE_ADDR');
  if (!contracts.cw4Group) missing.push('CW4_GROUP_ADDR');
  if (!contracts.proposal) missing.push('DAO_PROPOSAL_ADDR');

  return {
    isValid: missing.length === 0,
    missing,
  };
}

/**
 * Get contract addresses with validation
 * Throws error if required addresses are missing
 */
export function getValidatedContractAddresses(): ContractConfig {
  const validation = validateContractConfig();

  if (!validation.isValid) {
    throw new Error(
      `Missing required contract addresses: ${validation.missing.join(', ')}. ` +
        'Please check your .env file and ensure all contract addresses are configured.'
    );
  }

  return getContractAddresses();
}

// Export the contract addresses for easy access
export const CONTRACT_ADDRESSES = getContractAddresses();
