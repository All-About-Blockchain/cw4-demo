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
      // DAO Core contracts (placeholder values for testnet)
      dao_core: '1',
      dao_voting_cw4: '2',
      dao_proposal_single: '3',
      dao_proposal_multiple: '4',
      dao_pre_propose_single: '5',
      dao_pre_propose_multiple: '6',
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
      cw4_group: '2355',
      cw4_stake: '4',
      voting_registry: '5',
      // DAO Core contracts (placeholder values for testnet)
      dao_core: '1',
      dao_voting_cw4: '2',
      dao_proposal_single: '3',
      dao_proposal_multiple: '4',
      dao_pre_propose_single: '5',
      dao_pre_propose_multiple: '6',
    },
  },
  cosmos_hub_testnet: {
    chainId: 'theta-testnet-001',
    rpcEndpoint: 'https://cosmoshub-testnet.rpc.kjnodes.com',
    restEndpoint: 'https://cosmoshub-testnet.api.kjnodes.com',
    gasPrice: '0.025uatom',
    baseDenom: 'uatom',
    prefix: 'cosmos',
    token: 'ATOM',
    explorer: 'https://explorer.theta-testnet.polypore.xyz',
    contractCodes: {
      cw3_fixed_multisig: '1',
      cw3_flex_multisig: '2',
      cw4_group: '3',
      cw4_stake: '4',
      voting_registry: '5',
      // DAO Core contracts (placeholder values for testnet)
      dao_core: '1',
      dao_voting_cw4: '2',
      dao_proposal_single: '3',
      dao_proposal_multiple: '4',
      dao_pre_propose_single: '5',
      dao_pre_propose_multiple: '6',
    },
  },
  juno_mainnet: {
    chainId: 'juno-1',
    rpcEndpoint: 'https://juno-rpc.publicnode.com:443',
    restEndpoint: 'https://juno-rest.publicnode.com',
    gasPrice: '0.0025ujuno',
    baseDenom: 'ujuno',
    prefix: 'juno',
    token: 'JUNO',
    explorer: 'https://www.mintscan.io/juno',
    contractCodes: {
      // DAO Core contracts
      dao_core: '4870', // Main DAO core contract
      dao_voting_cw4: '4872', // Voting module
      dao_proposal_single: '4869', // Single choice proposals
      dao_proposal_multiple: '4868', // Multiple choice proposals
      dao_pre_propose_single: '4867', // Pre-propose for single
      dao_pre_propose_multiple: '4866', // Pre-propose for multiple
      cw4_group: '1992', // CW4 group contract
    },
  },
} as const;

// Select chain via env, default to Juno testnet
const SELECTED = (process.env.NEXT_PUBLIC_CHAIN ||
  'juno_testnet') as keyof typeof CHAINS;

export const CHAIN_CONFIG = CHAINS[SELECTED];

export const ADMIN_CONFIG = {
  memberWeight: 1,
} as const;
