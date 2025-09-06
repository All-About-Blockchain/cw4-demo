'use client';

import { useEffect, useState } from 'react';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';

export default function SignupPage() {
  const [address, setAddress] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');

  // Generate or load wallet
  async function loadWallet() {
    let mnemonic = localStorage.getItem('mnemonic');
    let wallet;

    if (!mnemonic) {
      wallet = await DirectSecp256k1HdWallet.generate(12, { prefix: 'juno' });
      mnemonic = wallet.mnemonic;
      localStorage.setItem('mnemonic', mnemonic);
    } else {
      wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
        prefix: 'juno',
      });
    }

    const [account] = await wallet.getAccounts();
    setAddress(account.address);
  }

  // Call backend to register attendee
  async function register() {
    if (!address) return;

    setStatus('Registering on-chain...');
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address }),
    });

    if (!res.ok) {
      setStatus('❌ Failed to register');
      return;
    }

    setStatus('✅ Registered! You are now in the governance group.');
  }

  useEffect(() => {
    loadWallet();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gray-100">
      <div className="bg-white shadow-lg rounded-2xl p-8 w-full max-w-md text-center">
        <h1 className="text-2xl font-bold mb-4">
          Conference Governance Signup
        </h1>

        {address ? (
          <>
            <p className="mb-4 text-gray-700">Your wallet address:</p>
            <p className="font-mono text-sm bg-gray-200 p-2 rounded mb-6">
              {address}
            </p>

            <button
              onClick={register}
              className="px-6 py-2 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700 transition"
            >
              Register
            </button>
          </>
        ) : (
          <p>Loading wallet...</p>
        )}

        {status && <p className="mt-6 text-gray-800">{status}</p>}
      </div>
    </div>
  );
}
