'use client';

import { useState } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const { address, isConnected, walletType, loading } = useWallet();
  const [status, setStatus] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const router = useRouter();

  // Call backend to register attendee
  async function register() {
    if (!address) return;

    setIsRegistering(true);
    setStatus('Registering on-chain...');

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });

      if (!res.ok) {
        const error = await res.json();
        setStatus(`❌ Failed to register: ${error.error}`);
        return;
      }

      setStatus('✅ Registered! You are now in the governance group.');

      // Redirect to home page after successful registration
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (error: any) {
      setStatus(`❌ Error: ${error.message}`);
    } finally {
      setIsRegistering(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading wallet...</div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white shadow-lg rounded-2xl p-8 w-full max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4 text-red-600">
            Wallet Not Connected
          </h1>
          <p className="text-gray-700 mb-6">
            You need to connect a wallet before registering for governance.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gray-100">
      <div className="bg-white shadow-lg rounded-2xl p-8 w-full max-w-md text-center">
        <h1 className="text-2xl font-bold mb-4">Governance Registration</h1>

        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-2">Connected with:</p>
          <p className="text-sm font-semibold text-gray-800 capitalize">
            {walletType} Wallet
          </p>
          <p className="text-xs font-mono text-gray-600 break-all mt-2">
            {address}
          </p>
        </div>

        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-800 mb-2">
            What happens when you register:
          </h3>
          <ul className="text-xs text-blue-700 space-y-1 text-left">
            <li>• You'll receive 1 JUNO for gas fees</li>
            <li>• You'll be added to the governance group</li>
            <li>• You can vote on governance proposals</li>
          </ul>
        </div>

        <button
          onClick={register}
          disabled={isRegistering}
          className="w-full px-6 py-3 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700 disabled:opacity-50 transition"
        >
          {isRegistering ? 'Registering...' : 'Register for Governance'}
        </button>

        {status && (
          <div className="mt-6 p-3 bg-gray-100 rounded-lg text-gray-700">
            {status}
          </div>
        )}
      </div>
    </div>
  );
}
