'use client';

import Link from 'next/link';
import { useAdmin } from './contexts/AdminContext';
import { useWallet } from './contexts/WalletContext';

export default function Home() {
  const { isAdmin, loading, userAddress } = useAdmin();
  const { isConnected, walletType, disconnect } = useWallet();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gray-100">
      <div className="bg-white shadow-lg rounded-2xl p-8 w-full max-w-md text-center">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">
          CW4 Governance
        </h1>
        <p className="text-gray-600 mb-8">
          A governance frontend for CW3/CW4 contracts
        </p>

        {!loading && isConnected && userAddress && (
          <div className="mb-6 p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm text-gray-600">Connected as:</p>
              <button
                onClick={disconnect}
                className="text-xs text-red-600 hover:text-red-800"
              >
                Disconnect
              </button>
            </div>
            <p className="text-xs font-mono text-gray-800 break-all mb-2">
              {userAddress}
            </p>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500 capitalize">
                {walletType} Wallet
              </span>
              {isAdmin && (
                <div className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-semibold">
                  ADMIN ACCESS
                </div>
              )}
            </div>
          </div>
        )}

        {!loading && !isConnected && (
          <div className="mb-6 p-3 bg-yellow-50 rounded-lg">
            <p className="text-sm text-yellow-800 mb-2">No wallet connected</p>
            <Link
              href="/login"
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Connect your wallet to get started
            </Link>
          </div>
        )}

        <div className="space-y-4">
          <Link
            href="/signup"
            className="block w-full px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
          >
            Join Governance
          </Link>

          <Link
            href="/governance"
            className="block w-full px-6 py-3 rounded-xl bg-gray-600 text-white font-semibold hover:bg-gray-700 transition"
          >
            View Proposals
          </Link>

          {isAdmin && (
            <Link
              href="/admin"
              className="block w-full px-6 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition"
            >
              Admin Interface
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
