// Chain configurations
const CHAINS = {
  juno_testnet: {
    chainId: 'uni-7',
    rpcEndpoint: 'https://rpc.testcosmos.directory/junotestnet',
    restEndpoint: 'https://rest.testcosmos.directory/junotestnet',
    gasPrice: '0.025ujunox',
    baseDenom: 'ujunox',
    prefix: 'juno',
    token: 'JUNOX',
    explorer: 'https://explorer.stavr.tech/Juno-Testnet',
  },
  neutron_testnet: {
    chainId: 'pion-1',
    rpcEndpoint: 'https://rpc.pion-1.ntrn.info',
    restEndpoint: 'https://rest.pion-1.ntrn.info',
    gasPrice: '0.025untrn',
    baseDenom: 'untrn',
    prefix: 'neutron',
    token: 'NTRN',
    explorer: 'https://www.mintscan.io/neutron-testnet',
  },
} as const;

// Select chain via env, default to Juno testnet
const SELECTED = (process.env.NEXT_PUBLIC_CHAIN ||
  'juno_testnet') as keyof typeof CHAINS;

export const CHAIN_CONFIG = CHAINS[SELECTED];

export const ADMIN_CONFIG = {
  fundingAmount: '1000000', // 1 JUNO in ujunox
  memberWeight: 1,
} as const;
