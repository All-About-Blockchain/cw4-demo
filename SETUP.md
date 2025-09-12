# DAO Governance Setup Guide

## Environment Configuration

To run this DAO governance application, you need to set up the following environment variables:

### Required Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```bash
# Admin wallet mnemonic for funding users and managing CW4 group
ADMIN_MNEMONIC=your_admin_wallet_mnemonic_here

# CW4 group contract address
CW4_ADDR=juno1your_cw4_contract_address_here

# Frontend chain selection (juno_testnet | neutron_testnet | cosmos_hub_testnet)
NEXT_PUBLIC_CHAIN=juno_testnet
```

### Getting Started

1. **Set up environment variables:**
   - Copy `env.example` to `.env.local`
   - Replace the placeholder values with your actual values

2. **Admin Wallet Setup:**
   - Generate or use an existing wallet mnemonic for the admin
   - This wallet will be used to fund new users and manage the CW4 group
   - Users with addresses derived from this mnemonic will have admin access

3. **CW4 Contract Setup:**
   - Deploy a CW4 group contract on your chosen chain
   - Set the contract address in the `CW4_ADDR` environment variable

4. **Chain Configuration:**
   - Choose your target chain using `NEXT_PUBLIC_CHAIN`
   - Supported chains: `juno_testnet`, `neutron_testnet`, `cosmos_hub_testnet`

### Development Mode

If you don't have the environment variables set up yet, the application will still run but with limited functionality:

- DAO membership checking will fail gracefully
- Registration will show configuration errors
- Users can still view the interface and connect wallets

### Error Handling

The application includes robust error handling for missing configuration:

- **500 errors** indicate missing environment variables
- **Configuration errors** are logged to the console
- **UI gracefully handles** missing DAO functionality

### Testing

To test the application without full setup:

1. Start the development server: `npm run dev`
2. Connect a wallet (Keplr or device wallet)
3. The app will show "Not a DAO Member" status
4. Registration will show configuration error messages

### Production Deployment

For production deployment:

1. Set up proper environment variables
2. Deploy CW4 contracts
3. Configure admin wallet with sufficient funds
4. Test all functionality before going live

## Troubleshooting

### Common Issues

1. **500 Internal Server Error:**
   - Check that `ADMIN_MNEMONIC` and `CW4_ADDR` are set
   - Verify the mnemonic is valid
   - Ensure the CW4 contract address is correct

2. **DAO Membership Check Fails:**
   - Verify the CW4 contract is deployed and accessible
   - Check that the contract address is correct
   - Ensure the RPC endpoint is working

3. **Registration Fails:**
   - Check that the admin wallet has sufficient funds
   - Verify the CW4 contract allows member updates
   - Ensure the admin wallet has the correct permissions

### Support

For issues and questions:

- Check the console logs for detailed error messages
- Verify all environment variables are correctly set
- Test with a fresh wallet to isolate issues
