'use client';

import { useState } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { useRouter } from 'next/navigation';
import { useBackNavigation } from '../hooks/useBackNavigation';

export default function LoginPage() {
  const {
    connectKeplr,
    generateWallet,
    restoreExistingWallet,
    disconnect,
    isConnected,
    address,
    walletType,
    loading,
    hasExistingWallet,
    isKeplrAvailable,
    hasCreatedWallet,
  } = useWallet();
  const [status, setStatus] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const router = useRouter();
  const { goBack } = useBackNavigation();

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white shadow-2xl rounded-3xl p-8 w-full max-w-md">
        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={goBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span className="text-sm font-medium">Back</span>
          </button>
        </div>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Connect Wallet
          </h1>
          <p className="text-gray-600">
            Choose how you'd like to connect to the governance platform
          </p>
        </div>

        <div className="space-y-3">
          {hasExistingWallet && (
            <button
              onClick={handleRestoreWallet}
              disabled={isConnecting}
              className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
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
          )}

          {isKeplrAvailable && (
            <button
              onClick={handleKeplrConnect}
              disabled={isConnecting}
              className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 text-white font-semibold hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
              <span>
                {isConnecting ? 'Connecting...' : 'Connect with Keplr'}
              </span>
            </button>
          )}

          <button
            onClick={handleGenerateWallet}
            disabled={isConnecting}
            className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
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
              {isConnecting
                ? hasCreatedWallet
                  ? 'Connecting...'
                  : 'Creating...'
                : hasCreatedWallet
                  ? 'Connect Wallet'
                  : 'Make Wallet'}
            </span>
          </button>
        </div>

        {status && (
          <div
            className={`mt-6 p-4 rounded-xl ${
              status.includes('✅')
                ? 'bg-green-50 border border-green-200 text-green-800'
                : status.includes('❌')
                  ? 'bg-red-50 border border-red-200 text-red-800'
                  : 'bg-blue-50 border border-blue-200 text-blue-800'
            }`}
          >
            <div className="flex items-center space-x-2">
              {status.includes('✅') && (
                <svg
                  className="w-5 h-5 text-green-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              {status.includes('❌') && (
                <svg
                  className="w-5 h-5 text-red-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              <span className="font-medium">{status}</span>
            </div>
          </div>
        )}

        <div className="mt-8 space-y-3">
          <div className="text-center">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Wallet Options
            </h3>
          </div>
          <div className="space-y-2 text-xs text-gray-600">
            {hasExistingWallet && (
              <div className="flex items-center space-x-2 p-2 bg-green-50 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>
                  <strong>Restore:</strong> Connect to your previously used
                  wallet
                </span>
              </div>
            )}
            {isKeplrAvailable && (
              <div className="flex items-center space-x-2 p-2 bg-purple-50 rounded-lg">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>
                  <strong>Keplr:</strong> Connect your existing Keplr wallet
                </span>
              </div>
            )}
            <div className="flex items-center space-x-2 p-2 bg-blue-50 rounded-lg">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>
                <strong>Generate:</strong> Create a new device-based wallet
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
