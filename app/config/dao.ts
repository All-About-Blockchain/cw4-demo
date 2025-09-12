import { getContractAddresses } from './contracts';

const contracts = getContractAddresses();

export const DAO_CONFIG = {
  address: contracts.daoCore,
  name: 'CW4 Demo DAO',
  description: 'A demonstration DAO built with CW4 group contracts',
  // Contract addresses from centralized configuration
  cw4GroupAddr: contracts.cw4Group,
  proposalAddr: contracts.proposal,
} as const;
