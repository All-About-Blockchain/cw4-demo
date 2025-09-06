'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { CHAIN_CONFIG } from '../config/chain';

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

  // Check for existing wallet connection on mount
  useEffect(() => {
    const checkExistingWallet = async () => {
      try {
        // Check for Keplr availability
        setIsKeplrAvailable(!!window.keplr);

        // Check for existing wallets first (synchronous check)
        const mnemonic = localStorage.getItem('mnemonic');
        const keplrAddress = localStorage.getItem('keplrAddress');

        const hasExisting = !!(mnemonic || keplrAddress);
        setHasExistingWallet(hasExisting);

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
              // Clear invalid mnemonic
              localStorage.removeItem('mnemonic');
              setHasExistingWallet(!!keplrAddress);
            }
          } else if (keplrAddress) {
            setAddress(keplrAddress);
            setIsConnected(true);
            setWalletType('keplr');
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

  const connectKeplr = async () => {
    try {
      if (!window.keplr) {
        throw new Error(
          'Keplr wallet not found. Please install Keplr extension.'
        );
      }

      // Enable Keplr for Juno
      await window.keplr.enable(CHAIN_CONFIG.chainId);

      // Get the offline signer
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
      const wallet = await DirectSecp256k1HdWallet.generate(12, {
        prefix: CHAIN_CONFIG.prefix,
      });
      const mnemonic = wallet.mnemonic;
      const [account] = await wallet.getAccounts();

      setAddress(account.address);
      setIsConnected(true);
      setWalletType('generated');
      localStorage.setItem('mnemonic', mnemonic);
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
        throw new Error('No existing wallet found');
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
    localStorage.removeItem('mnemonic');
    localStorage.removeItem('keplrAddress');
  };

  const refreshWalletDetection = () => {
    const mnemonic = localStorage.getItem('mnemonic');
    const keplrAddress = localStorage.getItem('keplrAddress');
    const hasExisting = !!(mnemonic || keplrAddress);
    setHasExistingWallet(hasExisting);
    setIsKeplrAvailable(!!window.keplr);
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
      enable: (chainId: string) => Promise<void>;
      getOfflineSigner: (chainId: string) => any;
    };
  }
}
