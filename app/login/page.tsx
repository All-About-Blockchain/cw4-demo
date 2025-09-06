'use client';

import { useState } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const {
    connectKeplr,
    generateWallet,
    restoreExistingWallet,
    disconnect,
    refreshWalletDetection,
    isConnected,
    address,
    walletType,
    loading,
    hasExistingWallet,
    isKeplrAvailable,
  } = useWallet();
  const [status, setStatus] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const router = useRouter();

  const handleKeplrConnect = async () => {
    setIsConnecting(true);
    setStatus('');

    try {
      await connectKeplr();
      setStatus('✅ Connected with Keplr wallet!');
      // Redirect to home page after successful connection
      setTimeout(() => {
        router.push('/');
      }, 1500);
    } catch (error: any) {
      setStatus(`❌ ${error.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleRestoreWallet = async () => {
    setIsConnecting(true);
    setStatus('');

    try {
      await restoreExistingWallet();
      setStatus('✅ Restored existing wallet!');
      // Redirect to home page after successful restoration
      setTimeout(() => {
        router.push('/');
      }, 1500);
    } catch (error: any) {
      setStatus(`❌ ${error.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleGenerateWallet = async () => {
    setIsConnecting(true);
    setStatus('');

    try {
      await generateWallet();
      setStatus('✅ Generated new wallet!');
      // Redirect to home page after successful generation
      setTimeout(() => {
        router.push('/');
      }, 1500);
    } catch (error: any) {
      setStatus(`❌ ${error.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white shadow-lg rounded-2xl p-8 w-full max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4 text-green-600">
            Wallet Connected
          </h1>
          <p className="text-gray-700 mb-4">
            You're already connected with a {walletType} wallet.
          </p>
          <div className="text-sm text-gray-500 mb-6">
            <p className="font-mono break-all">{address}</p>
          </div>
          <div className="space-y-3">
            <button
              onClick={() => router.push('/')}
              className="w-full px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => {
                // Disconnect and refresh the page to show login options
                disconnect();
                window.location.reload();
              }}
              className="w-full px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
            >
              Switch Wallet
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white shadow-lg rounded-2xl p-8 w-full max-w-md text-center">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">
          Connect Wallet
        </h1>
        <p className="text-gray-600 mb-8">
          Choose how you'd like to connect to the governance platform
        </p>

        {/* Debug info - remove in production */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-4 p-2 bg-gray-100 rounded text-xs text-gray-600">
            <p>Debug: hasExistingWallet={hasExistingWallet.toString()}</p>
            <p>Debug: isKeplrAvailable={isKeplrAvailable.toString()}</p>
            <button
              onClick={refreshWalletDetection}
              className="mt-1 px-2 py-1 bg-blue-500 text-white rounded text-xs"
            >
              Refresh Detection
            </button>
          </div>
        )}

        <div className="space-y-4">
          {hasExistingWallet && (
            <>
              <button
                onClick={handleRestoreWallet}
                disabled={isConnecting}
                className="w-full px-6 py-4 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700 disabled:opacity-50 transition flex items-center justify-center space-x-2"
              >
                <svg
                  className="w-6 h-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                  <path d="M21 3v5h-5" />
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                  <path d="M3 21v-5h5" />
                </svg>
                <span>
                  {isConnecting ? 'Restoring...' : 'Restore Existing Wallet'}
                </span>
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">or</span>
                </div>
              </div>
            </>
          )}

          {isKeplrAvailable && (
            <>
              <button
                onClick={handleKeplrConnect}
                disabled={isConnecting}
                className="w-full px-6 py-4 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-700 disabled:opacity-50 transition flex items-center justify-center space-x-2"
              >
                <svg
                  className="w-6 h-6"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
                <span>
                  {isConnecting ? 'Connecting...' : 'Connect with Keplr'}
                </span>
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">or</span>
                </div>
              </div>
            </>
          )}

          <button
            onClick={handleGenerateWallet}
            disabled={isConnecting}
            className="w-full px-6 py-4 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center space-x-2"
          >
            <svg
              className="w-6 h-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            <span>
              {isConnecting ? 'Generating...' : 'Generate New Wallet'}
            </span>
          </button>
        </div>

        {status && (
          <div className="mt-6 p-3 bg-gray-100 rounded-lg text-gray-700">
            {status}
          </div>
        )}

        <div className="mt-8 text-xs text-gray-500 space-y-2">
          {hasExistingWallet && (
            <p>
              <strong>Restore:</strong> Connect to your previously used wallet
            </p>
          )}
          {isKeplrAvailable && (
            <p>
              <strong>Keplr:</strong> Connect your existing Keplr wallet
            </p>
          )}
          <p>
            <strong>Generate:</strong> Create a new wallet (stored locally)
          </p>
        </div>
      </div>
    </div>
  );
}
