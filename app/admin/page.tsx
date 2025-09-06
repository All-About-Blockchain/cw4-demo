'use client';

import { useAdmin } from '../contexts/AdminContext';
import AdminInterface from '../components/AdminInterface';

export default function AdminPage() {
  const { isAdmin, loading, userAddress, adminAddress } = useAdmin();

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
