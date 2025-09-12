'use client';

import { useAdmin } from '../contexts/AdminContext';
import AdminInterface from '../components/AdminInterface';
import { useRouter } from 'next/navigation';
import { useBackNavigation } from '../hooks/useBackNavigation';

export default function AdminPage() {
  const { isAdmin, loading, userAddress, adminAddress } = useAdmin();
  const router = useRouter();
  const { goBack } = useBackNavigation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading admin status...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white shadow-lg rounded-2xl p-8 w-full max-w-md text-center">
          {/* Back Button */}
          <div className="mb-6 text-left">
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

          <h1 className="text-2xl font-bold mb-4 text-red-600">
            Access Denied
          </h1>
          <p className="text-gray-700 mb-4">
            You don't have admin privileges to access this page.
          </p>
          <div className="text-sm text-gray-500 space-y-2">
            <p>Your address: {userAddress}</p>
            <p>Admin address: {adminAddress}</p>
          </div>
          <div className="mt-6">
            <a
              href="/"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Go Home
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminInterface />
    </div>
  );
}
