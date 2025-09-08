'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useWallet } from './WalletContext';
import { mergeMultisigs } from '../config/multisig';

interface AdminContextType {
  isAdmin: boolean;
  adminAddress: string | null;
  userAddress: string | null;
  loading: boolean;
  multisigs?: string[];
  addMultisig?: (address: string) => void;
  currentMultisig?: string | null;
  setCurrentMultisig?: (address: string | null) => void;
}

const AdminContext = createContext<AdminContextType>({
  isAdmin: false,
  adminAddress: null,
  userAddress: null,
  loading: true,
});

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const { address, isConnected, loading: walletLoading } = useWallet();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminAddress, setAdminAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [multisigs, setMultisigs] = useState<string[]>([]);
  const [currentMultisig, _setCurrentMultisig] = useState<string | null>(null);

  useEffect(() => {
    // Load local list; current is always env CW4
    const fromLocal = (() => {
      try {
        const s = localStorage.getItem('multisigs');
        return s ? (JSON.parse(s) as string[]) : [];
      } catch {
        return [] as string[];
      }
    })();

    const { all, current } = mergeMultisigs(fromLocal);
    setMultisigs(all);
    _setCurrentMultisig(current);
  }, []);

  const addMultisig = (newAddress: string) => {
    const updated = [...multisigs, newAddress];
    setMultisigs(updated);
    localStorage.setItem('multisigs', JSON.stringify(updated));
  };
  const setCurrentMultisig = (_addr: string | null) => {
    // no-op: active multisig is env-driven
  };

  useEffect(() => {
    async function checkAdminStatus() {
      if (walletLoading) return;

      try {
        if (!isConnected || !address) {
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        // Get list of admin addresses derived from mnemonic across prefixes and first accounts
        const response = await fetch('/api/admin/addresses');
        if (response.ok) {
          const { adminAddresses } = await response.json();
          // Prefer showing the one matching current prefix if present, else first
          const match =
            (adminAddresses as string[]).find(a => a === address) || null;
          setAdminAddress(match);
          setIsAdmin(!!match);
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
      } finally {
        setLoading(false);
      }
    }

    checkAdminStatus();
  }, [address, isConnected, walletLoading]);

  return (
    <AdminContext.Provider
      value={{
        isAdmin,
        adminAddress,
        userAddress: address,
        loading,
        multisigs,
        addMultisig,
        currentMultisig,
        setCurrentMultisig,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}
