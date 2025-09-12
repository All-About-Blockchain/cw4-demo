'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { CHAIN_CONFIG } from '../config/chain';
import { generateDeviceMnemonic } from '../utils/deviceFingerprint';
import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { GasPrice } from '@cosmjs/stargate';

interface WalletContextType {
  address: string | null;
  isConnected: boolean;
  walletType: 'keplr' | 'generated' | null;
  connectKeplr: () => Promise<void>;
  generateWallet: () => Promise<void>;
  restoreExistingWallet: () => Promise<void>;
  disconnect: () => void;
  refreshWalletDetection: () => void;
  loading: boolean;
  hasExistingWallet: boolean;
  isKeplrAvailable: boolean;
  hasCreatedWallet: boolean;
  balance: string | null;
  balanceLoading: boolean;
  refreshBalance: () => Promise<void>;
  isDAOMember: boolean;
  daoMembershipLoading: boolean;
  checkDAOMembership: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType>({
  address: null,
  isConnected: false,
  walletType: null,
  connectKeplr: async () => {},
  generateWallet: async () => {},
  restoreExistingWallet: async () => {},
  disconnect: () => {},
  refreshWalletDetection: () => {},
  loading: true,
  hasExistingWallet: false,
  isKeplrAvailable: false,
  hasCreatedWallet: false,
  balance: null,
  balanceLoading: false,
  refreshBalance: async () => {},
  isDAOMember: false,
  daoMembershipLoading: false,
  checkDAOMembership: async () => {},
});

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [walletType, setWalletType] = useState<'keplr' | 'generated' | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [hasExistingWallet, setHasExistingWallet] = useState(false);
  const [isKeplrAvailable, setIsKeplrAvailable] = useState(false);
  const [hasCreatedWallet, setHasCreatedWallet] = useState(false);
  const [balance, setBalance] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [isDAOMember, setIsDAOMember] = useState(false);
  const [daoMembershipLoading, setDAOMembershipLoading] = useState(false);

  // Check for existing wallet connection on mount
  useEffect(() => {
    const checkExistingWallet = async () => {
      try {
        // Check for Keplr availability
        setIsKeplrAvailable(!!window.keplr);

        // Check for existing wallets first (synchronous check)
        const mnemonic = localStorage.getItem('mnemonic');
        const keplrAddress = localStorage.getItem('keplrAddress');
        const walletCreated = localStorage.getItem('walletCreated') === 'true';

        const hasExisting = !!(mnemonic || keplrAddress);
        setHasExistingWallet(hasExisting);
        setHasCreatedWallet(walletCreated);

        // If we have existing wallets, try to connect them
        if (hasExisting) {
          if (mnemonic) {
            try {
              const wallet = await DirectSecp256k1HdWallet.fromMnemonic(
                mnemonic,
                {
                  prefix: CHAIN_CONFIG.prefix,
                }
              );
              const [account] = await wallet.getAccounts();
              setAddress(account.address);
              setIsConnected(true);
              setWalletType('generated');
            } catch (error) {
              console.error('Error loading existing mnemonic wallet:', error);
              // Clear invalid mnemonic and generate a new device-based wallet
              localStorage.removeItem('mnemonic');
              try {
                const deviceMnemonic = generateDeviceMnemonic();
                const wallet = await DirectSecp256k1HdWallet.fromMnemonic(
                  deviceMnemonic,
                  {
                    prefix: CHAIN_CONFIG.prefix,
                  }
                );
                const [account] = await wallet.getAccounts();
                setAddress(account.address);
                setIsConnected(true);
                setWalletType('generated');
                localStorage.setItem('mnemonic', deviceMnemonic);
                setHasExistingWallet(true);
              } catch (deviceError) {
                console.error('Error generating device wallet:', deviceError);
                setHasExistingWallet(!!keplrAddress);
              }
            }
          } else if (keplrAddress) {
            setAddress(keplrAddress);
            setIsConnected(true);
            setWalletType('keplr');
          }
        } else {
          // No existing wallet, generate a device-based wallet
          try {
            const deviceMnemonic = generateDeviceMnemonic();
            const wallet = await DirectSecp256k1HdWallet.fromMnemonic(
              deviceMnemonic,
              {
                prefix: CHAIN_CONFIG.prefix,
              }
            );
            const [account] = await wallet.getAccounts();
            setAddress(account.address);
            setIsConnected(true);
            setWalletType('generated');
            localStorage.setItem('mnemonic', deviceMnemonic);
            setHasExistingWallet(true);
          } catch (error) {
            console.error('Error generating initial device wallet:', error);
          }
        }
      } catch (error) {
        console.error('Error checking existing wallet:', error);
        // Clear invalid data
        localStorage.removeItem('mnemonic');
        localStorage.removeItem('keplrAddress');
        setHasExistingWallet(false);
      } finally {
        setLoading(false);
      }
    };

    checkExistingWallet();
  }, []);

  // Fetch balance when address changes
  useEffect(() => {
    if (address && isConnected) {
      refreshBalance();
    } else {
      setBalance(null);
    }
  }, [address, isConnected]);

  // Check DAO membership when address changes
  useEffect(() => {
    if (address && isConnected) {
      checkDAOMembership();
    } else {
      setIsDAOMember(false);
    }
  }, [address, isConnected]);

  const connectKeplr = async () => {
    try {
      if (!window.keplr) {
        throw new Error(
          'Keplr wallet not found. Please install Keplr extension.'
        );
      }

      // Suggest chain to Keplr if not known
      if (window.keplr.experimentalSuggestChain) {
        await window.keplr.experimentalSuggestChain({
          chainId: CHAIN_CONFIG.chainId,
          chainName: 'Juno Testnet',
          rpc: CHAIN_CONFIG.rpcEndpoint,
          rest: CHAIN_CONFIG.restEndpoint,
          bip44: { coinType: 118 },
          bech32Config: {
            bech32PrefixAccAddr: 'juno',
            bech32PrefixAccPub: 'junopub',
            bech32PrefixValAddr: 'junovaloper',
            bech32PrefixValPub: 'junovaloperpub',
            bech32PrefixConsAddr: 'junovalcons',
            bech32PrefixConsPub: 'junovalconspub',
          },
          currencies: [
            {
              coinDenom: 'JUNO',
              coinMinimalDenom: 'ujunox',
              coinDecimals: 6,
              coinGeckoId: 'juno-network',
            },
          ],
          feeCurrencies: [
            {
              coinDenom: 'JUNO',
              coinMinimalDenom: 'ujunox',
              coinDecimals: 6,
              coinGeckoId: 'juno-network',
              gasPriceStep: { low: 0.025, average: 0.05, high: 0.1 },
            },
          ],
          stakeCurrency: {
            coinDenom: 'JUNO',
            coinMinimalDenom: 'ujunox',
            coinDecimals: 6,
            coinGeckoId: 'juno-network',
          },
          features: ['stargate', 'ibc-transfer', 'no-legacy-stdTx'],
        });
      }

      // Enable Keplr for Juno
      await window.keplr.enable(CHAIN_CONFIG.chainId);

      // Get offline signer
      const offlineSigner = window.keplr.getOfflineSigner(CHAIN_CONFIG.chainId);
      const accounts = await offlineSigner.getAccounts();

      if (accounts.length === 0) {
        throw new Error('No accounts found in Keplr wallet');
      }

      const userAddress = accounts[0].address;
      setAddress(userAddress);
      setIsConnected(true);
      setWalletType('keplr');
      localStorage.setItem('keplrAddress', userAddress);
    } catch (error: any) {
      console.error('Error connecting Keplr:', error);
      throw error;
    }
  };

  const generateWallet = async () => {
    try {
      // Generate a deterministic mnemonic based on device characteristics
      const mnemonic = generateDeviceMnemonic();

      // Create wallet from the device-based mnemonic
      const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
        prefix: CHAIN_CONFIG.prefix,
      });
      const [account] = await wallet.getAccounts();

      setAddress(account.address);
      setIsConnected(true);
      setWalletType('generated');
      localStorage.setItem('mnemonic', mnemonic);
      localStorage.setItem('walletCreated', 'true');
      setHasCreatedWallet(true);
    } catch (error: any) {
      console.error('Error generating wallet:', error);
      throw error;
    }
  };

  const restoreExistingWallet = async () => {
    try {
      const mnemonic = localStorage.getItem('mnemonic');
      const keplrAddress = localStorage.getItem('keplrAddress');

      if (mnemonic) {
        const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
          prefix: CHAIN_CONFIG.prefix,
        });
        const [account] = await wallet.getAccounts();
        setAddress(account.address);
        setIsConnected(true);
        setWalletType('generated');
      } else if (keplrAddress) {
        setAddress(keplrAddress);
        setIsConnected(true);
        setWalletType('keplr');
      } else {
        // If no stored wallet, generate a new device-based wallet
        await generateWallet();
      }
    } catch (error: any) {
      console.error('Error restoring wallet:', error);
      throw error;
    }
  };

  const disconnect = () => {
    setAddress(null);
    setIsConnected(false);
    setWalletType(null);
    setHasExistingWallet(false);
    setHasCreatedWallet(false);
    localStorage.removeItem('mnemonic');
    localStorage.removeItem('keplrAddress');
    localStorage.removeItem('walletCreated');
  };

  const refreshWalletDetection = () => {
    const mnemonic = localStorage.getItem('mnemonic');
    const keplrAddress = localStorage.getItem('keplrAddress');
    const walletCreated = localStorage.getItem('walletCreated') === 'true';
    const hasExisting = !!(mnemonic || keplrAddress);
    setHasExistingWallet(hasExisting);
    setHasCreatedWallet(walletCreated);
    setIsKeplrAvailable(!!window.keplr);
  };

  const refreshBalance = async () => {
    if (!address) {
      setBalance(null);
      setBalanceLoading(false);
      return;
    }

    setBalanceLoading(true);
    try {
      const client = await SigningCosmWasmClient.connectWithSigner(
        CHAIN_CONFIG.rpcEndpoint,
        null as any, // We don't need a signer for balance queries
        {
          gasPrice: GasPrice.fromString(`${CHAIN_CONFIG.gasPrice}`),
        }
      );

      const balance = await client.getBalance(address, CHAIN_CONFIG.baseDenom);
      // Most Cosmos chains use 6 decimal places for their base denomination
      const balanceAmount = balance
        ? (parseInt(balance.amount) / Math.pow(10, 6)).toFixed(6)
        : '0';
      setBalance(`${balanceAmount} ${CHAIN_CONFIG.token}`);
    } catch (error) {
      console.error('Error fetching balance:', error);
      setBalance('Error loading balance');
    } finally {
      setBalanceLoading(false);
    }
  };

  const checkDAOMembership = async () => {
    if (!address) {
      setIsDAOMember(false);
      setDAOMembershipLoading(false);
      return;
    }

    setDAOMembershipLoading(true);
    try {
      const response = await fetch(
        `/api/dao/check-membership?address=${address}`
      );
      if (response.ok) {
        const data = await response.json();
        setIsDAOMember(data.isMember);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error checking DAO membership:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData.error || 'Unknown error',
        });
        // If it's a configuration error, treat as non-member
        setIsDAOMember(false);
      }
    } catch (error) {
      console.error('Error checking DAO membership:', error);
      setIsDAOMember(false);
    } finally {
      setDAOMembershipLoading(false);
    }
  };

  return (
    <WalletContext.Provider
      value={{
        address,
        isConnected,
        walletType,
        connectKeplr,
        generateWallet,
        restoreExistingWallet,
        disconnect,
        refreshWalletDetection,
        loading,
        hasExistingWallet,
        isKeplrAvailable,
        hasCreatedWallet,
        balance,
        balanceLoading,
        refreshBalance,
        isDAOMember,
        daoMembershipLoading,
        checkDAOMembership,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}

// Extend Window interface for Keplr
declare global {
  interface Window {
    keplr?: {
      experimentalSuggestChain: any;
      enable: (chainId: string) => Promise<void>;
      getOfflineSigner: (chainId: string) => any;
    };
  }
}
