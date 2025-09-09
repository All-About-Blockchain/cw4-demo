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
    contractCodes: {
      cw3_fixed_multisig: '1',
      cw3_flex_multisig: '2',
      cw4_group: '3',
      cw4_stake: '4',
      voting_registry: '5',
    },
  },
  neutron_testnet: {
    chainId: 'pion-1',
    rpcEndpoint: 'https://neutron-testnet-rpc.polkachu.com',
    restEndpoint: 'https://neutron-testnet-rest.polkachu.com',
    gasPrice: '0.025untrn',
    baseDenom: 'untrn',
    prefix: 'neutron',
    token: 'NTRN',
    explorer: 'https://www.mintscan.io/neutron-testnet',
    contractCodes: {
      cw3_fixed_multisig: '1',
      cw3_flex_multisig: '2',
      cw4_group: '3',
      cw4_stake: '4',
      voting_registry: '5',
    },
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
