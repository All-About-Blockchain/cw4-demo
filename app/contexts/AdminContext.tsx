'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useWallet } from './WalletContext';

interface AdminContextType {
  isAdmin: boolean;
  adminAddress: string | null;
  userAddress: string | null;
  loading: boolean;
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

  useEffect(() => {
    async function checkAdminStatus() {
      if (walletLoading) return;

      try {
        if (!isConnected || !address) {
          setUserAddress(null);
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        setUserAddress(address);

        // Get admin address from environment
        const response = await fetch('/api/admin/address');
        if (response.ok) {
          const { adminAddress: envAdminAddress } = await response.json();
          setAdminAddress(envAdminAddress);
          setIsAdmin(address === envAdminAddress);
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
      value={{ isAdmin, adminAddress, userAddress: address, loading }}
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
