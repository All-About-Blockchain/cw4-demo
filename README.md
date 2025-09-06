# CW4 Governance Frontend

A Next.js frontend for CW3/CW4 governance contracts on Juno network.

## Features

- **Wallet Integration**: Generate and manage Juno wallets using CosmJS
- **Governance Signup**: Register for governance participation
- **Proposal Management**: View and vote on governance proposals
- **Modern UI**: Built with Tailwind CSS for a clean, responsive design

## Tech Stack

- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **CosmJS** for blockchain interactions
- **Juno Network** integration

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Set up environment variables:

```bash
cp env.example .env.local
```

Then edit `.env.local` with your actual values:

- `ADMIN_MNEMONIC`: Your admin wallet mnemonic for funding users and managing the CW4 group
- `CW4_ADDR`: Your deployed CW4 group contract address

3. Run the development server:

```bash
npm run dev
```

4. Format code (optional):

```bash
npm run format        # Format all files
npm run format:check  # Check formatting without changing files
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── app/
│   ├── api/register/     # API route for user registration
│   ├── governance/       # Governance proposals page
│   ├── signup/          # User signup page
│   ├── globals.css      # Global styles
│   ├── layout.tsx       # Root layout
│   └── page.tsx         # Home page
├── package.json
├── tailwind.config.js
└── tsconfig.json
```

## Features Overview

### Home Page (`/`)

- Landing page with navigation to signup and governance

### Signup Page (`/signup`)

- Generates or loads a Juno wallet
- Registers the user for governance participation
- Uses CosmJS for wallet management

### Governance Page (`/governance`)

- Displays active and past proposals
- Shows voting statistics
- Allows voting on open proposals (UI ready)

### API Routes

- `/api/register` - Handles user registration for governance
  - Funds the user with 1,000,000 ujunox tokens
  - Adds the user to the CW4 group with weight 1

## Development Notes

- The project uses the App Router (Next.js 13+)
- Wallet mnemonics are stored in localStorage (for demo purposes)
- **CW4 contract integration is fully implemented** - users are automatically added to the governance group
- All blockchain interactions use CosmJS libraries
- Connects to Juno testnet (uni-6) by default

## Next Steps

1. ✅ **CW4 group contract integration** - COMPLETED
2. Add CW3 voting contract integration
3. ✅ **Transaction signing and broadcasting** - COMPLETED
4. Add proper error handling and loading states
5. Add wallet connection with Keplr or other wallet providers
6. Implement proposal creation functionality
