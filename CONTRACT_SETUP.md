# Contract Address Configuration

This document explains how to configure contract addresses for the DAO application.

## Environment Variables

All contract addresses are managed through environment variables in the `.env` file. This allows for easy deployment across different environments (development, staging, production) without code changes.

### Required Environment Variables

```bash
# Admin wallet mnemonic for funding users and managing CW4 group
ADMIN_MNEMONIC=your_admin_wallet_mnemonic_here

# DAO Contract Addresses
# Main DAO core contract address
DAO_CORE_ADDR=juno185xlnz0zzsg2fl6njf7luwlmtj72qe3unqcj2vaxj7ze0ftdswuqkz4x4v

# CW4 group contract address (voting module)
CW4_GROUP_ADDR=juno1mugyuzerl90g4c9s8vgt0d0w5dj3xxd9kp8j05kehdncvm43wt2s5agn3f

# DAO proposal contract address
DAO_PROPOSAL_ADDR=juno1l5mruy2p6apttcz2nrq4arvhw27j6k2hn5zvfz62jlw2khed7g7qe3p3cy

# Legacy CW4_ADDR for backward compatibility
CW4_ADDR=juno1mugyuzerl90g4c9s8vgt0d0w5dj3xxd9kp8j05kehdncvm43wt2s5agn3f

# Frontend-readable contract addresses (NEXT_PUBLIC_ prefix makes them available in browser)
NEXT_PUBLIC_DAO_CORE_ADDR=juno185xlnz0zzsg2fl6njf7luwlmtj72qe3unqcj2vaxj7ze0ftdswuqkz4x4v
NEXT_PUBLIC_CW4_GROUP_ADDR=juno1mugyuzerl90g4c9s8vgt0d0w5dj3xxd9kp8j05kehdncvm43wt2s5agn3f
NEXT_PUBLIC_DAO_PROPOSAL_ADDR=juno1l5mruy2p6apttcz2nrq4arvhw27j6k2hn5zvfz62jlw2khed7g7qe3p3cy
NEXT_PUBLIC_CW4_ADDR=juno1mugyuzerl90g4c9s8vgt0d0w5dj3xxd9kp8j05kehdncvm43wt2s5agn3f

# Frontend chain selection (juno_testnet | neutron_testnet | cosmos_hub_testnet)
NEXT_PUBLIC_CHAIN=juno_testnet
```

## Contract Addresses Explained

### DAO_CORE_ADDR

- **Purpose**: Main DAO core contract address
- **Usage**: Primary DAO contract that manages governance, proposals, and voting
- **Example**: `juno185xlnz0zzsg2fl6njf7luwlmtj72qe3unqcj2vaxj7ze0ftdswuqkz4x4v`

### CW4_GROUP_ADDR

- **Purpose**: CW4 group contract address (voting module)
- **Usage**: Manages DAO membership and voting power
- **Example**: `juno1mugyuzerl90g4c9s8vgt0d0w5dj3xxd9kp8j05kehdncvm43wt2s5agn3f`

### DAO_PROPOSAL_ADDR

- **Purpose**: DAO proposal contract address
- **Usage**: Handles proposal creation, voting, and execution
- **Example**: `juno1l5mruy2p6apttcz2nrq4arvhw27j6k2hn5zvfz62jlw2khed7g7qe3p3cy`

## Configuration Files

### `app/config/contracts.ts`

Centralized contract configuration that:

- Reads from environment variables
- Provides fallback to default addresses
- Validates configuration completeness
- Supports both server-side and client-side access

### `app/config/dao.ts`

DAO-specific configuration that uses the centralized contract addresses.

## Usage in Code

### Server-side (API routes)

```typescript
import { getValidatedContractAddresses } from '../../config/contracts';

const contracts = getValidatedContractAddresses();
const cw4GroupAddress = contracts.cw4Group;
const proposalAddress = contracts.proposal;
```

### Client-side (React components)

```typescript
import { DAO_CONFIG } from '../config/dao';

const daoAddress = DAO_CONFIG.address;
const cw4GroupAddr = DAO_CONFIG.cw4GroupAddr;
```

## Environment Variable Priority

The system checks for environment variables in this order:

1. Server-side variables (e.g., `DAO_CORE_ADDR`)
2. Client-side variables (e.g., `NEXT_PUBLIC_DAO_CORE_ADDR`)
3. Default fallback addresses

## Deployment

### Development

1. Copy `env.example` to `.env`
2. Update contract addresses to your deployed contracts
3. Set your admin mnemonic

### Production

1. Set environment variables in your deployment platform
2. Ensure all required addresses are configured
3. Use production contract addresses

## Validation

The system automatically validates that all required contract addresses are configured. If any are missing, you'll get a clear error message indicating which addresses need to be set.

## Benefits

- **Universal Management**: All contract addresses in one place
- **Environment Flexibility**: Easy deployment across different environments
- **Type Safety**: TypeScript interfaces ensure correct usage
- **Validation**: Automatic validation of configuration completeness
- **Fallbacks**: Graceful fallback to default addresses if needed
