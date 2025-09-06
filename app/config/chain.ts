// Juno Testnet Configuration
export const CHAIN_CONFIG = {
  chainId: 'uni-7',
  rpcEndpoint: 'https://rpc.testcosmos.directory/junotestnet',
  restEndpoint: 'https://rest.testcosmos.directory/junotestnet',
  gasPrice: '0.025ujunox',
  prefix: 'juno',
  token: 'JUNOX',
  explorer: 'https://explorer.stavr.tech/Juno-Testnet',
} as const;

export const ADMIN_CONFIG = {
  fundingAmount: '1000000', // 1 JUNO in ujunox
  memberWeight: 1,
} as const;
