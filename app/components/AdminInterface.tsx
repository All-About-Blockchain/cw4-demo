'use client';

import { useEffect, useState } from 'react';
import { useAdmin } from '../contexts/AdminContext';
import { useWallet } from '../contexts/WalletContext';
import { CHAIN_CONFIG } from '../config/chain';

interface GroupMember {
  addr: string;
  weight: number;
}

export default function AdminInterface() {
  const {
    adminAddress,
    userAddress,
    multisigs,
    addMultisig,
    currentMultisig,
    setCurrentMultisig,
  } = useAdmin();
  const { disconnect } = useWallet();
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [balance, setBalance] = useState<string>('');

  const [newMultisig, setNewMultisig] = useState('');

  const handleCreateMultisig = async () => {
    if (!newMultisig) return;

    try {
      // Call backend to create multisig on-chain (or simulate)
      const response = await fetch('/api/admin/create-multisig', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ members }),
      });

      if (response.ok) {
        const { address } = await response.json();
        addMultisig?.(address);
        setStatus(`Created new multisig: ${address}`);
        setNewMultisig('');
      } else {
        setStatus('Failed to create multisig');
      }
    } catch (err) {
      setStatus('Error creating multisig');
    }
  };

  const fetchGroupMembers = async () => {
    setLoading(true);
    setStatus('Fetching group members...');

    try {
      const response = await fetch('/api/admin/members');
      if (response.ok) {
        const data = await response.json();
        setMembers(data.members || []);
        setStatus(`Found ${data.members?.length || 0} members`);
      } else {
        setStatus('Failed to fetch members');
      }
    } catch (error) {
      setStatus('Error fetching members');
    } finally {
      setLoading(false);
    }
  };

  const removeMember = async (address: string) => {
    if (!confirm(`Are you sure you want to remove ${address}?`)) return;

    setLoading(true);
    setStatus(`Removing ${address}...`);

    try {
      const response = await fetch('/api/admin/remove-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });

      if (response.ok) {
        setStatus(`Successfully removed ${address}`);
        fetchGroupMembers(); // Refresh the list
      } else {
        const error = await response.json();
        setStatus(`Failed to remove member: ${error.error}`);
      }
    } catch (error) {
      setStatus('Error removing member');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        if (!adminAddress) return;
        const res = await fetch(
          `/api/admin/balance?address=${encodeURIComponent(adminAddress)}`
        );
        if (!res.ok) return;
        const data = await res.json();
        const amount = Number(data.amount || '0') / 1_000_000;
        setBalance(
          `${amount.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${CHAIN_CONFIG.token}`
        );
      } catch (e) {
        // ignore
      }
    };
    fetchBalance();
  }, [adminAddress]);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Admin Interface</h1>
          <div className="flex items-center gap-3">
            <div className="text-xs px-2 py-1 rounded bg-indigo-100 text-indigo-800 font-medium">
              {CHAIN_CONFIG.chainId}
            </div>
            {balance && (
              <div className="text-sm text-gray-700 bg-gray-100 px-2 py-1 rounded">
                Balance: {balance}
              </div>
            )}
            <div className="text-sm text-gray-500">Admin: {adminAddress}</div>
            <button
              onClick={disconnect}
              className="px-3 py-1 text-sm bg-red-600 text-white hover:bg-red-700 rounded"
            >
              Disconnect
            </button>
          </div>
        </div>

        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">
            Group Management
          </h2>
          <p className="text-blue-700 mb-3">
            Manage CW4 group members and monitor governance participation.
          </p>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-700">Current multisig:</span>
            <span className="font-mono break-all px-2 py-1 rounded bg-white border">
              {currentMultisig || 'None selected'}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <button
            onClick={fetchGroupMembers}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Fetch Group Members'}
          </button>

          {status && (
            <div className="p-3 bg-gray-100 rounded-lg text-gray-700">
              {status}
            </div>
          )}

          {members.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4">Group Members</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                        Address
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                        Weight
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member, index) => (
                      <tr key={index} className="border-t border-gray-200">
                        <td className="px-4 py-2 text-sm font-mono">
                          {member.addr}
                        </td>
                        <td className="px-4 py-2 text-sm">{member.weight}</td>
                        <td className="px-4 py-2 text-sm">
                          {member.addr !== adminAddress && (
                            <button
                              onClick={() => removeMember(member.addr)}
                              disabled={loading}
                              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 text-xs"
                            >
                              Remove
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 p-4 bg-green-50 rounded-lg">
          <h3 className="text-lg font-semibold text-green-800 mb-2">
            Multisigs
          </h3>

          <div className="space-y-2">
            <input
              type="text"
              placeholder="New multisig name or id"
              value={newMultisig}
              onChange={e => setNewMultisig(e.target.value)}
              className="px-3 py-2 border rounded w-full text-green-800"
            />
            <button
              onClick={handleCreateMultisig}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Create New Multisig
            </button>
          </div>

          {multisigs?.length ? (
            <div className="mt-4 space-y-2">
              {multisigs.map((m, i) => {
                const fromEnvCurrent = process.env.NEXT_PUBLIC_CW4_ADDR === m;
                const badge = fromEnvCurrent
                  ? {
                      label: 'CW4 (Active)',
                      cls: 'bg-indigo-100 text-indigo-800',
                    }
                  : { label: 'Alt', cls: 'bg-gray-100 text-gray-800' };
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono break-all">{m}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] ${badge.cls}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-2 text-gray-600 text-sm">No multisigs yet</p>
          )}
        </div>

        <div className="mt-8 p-4 bg-yellow-50 rounded-lg">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">
            Admin Actions
          </h3>
          <div className="space-y-2 text-sm text-yellow-700">
            <p>• View and manage all group members</p>
            <p>• Remove members from the governance group</p>
            <p>• Monitor governance participation</p>
            <p>• Access to administrative functions</p>
          </div>
        </div>
      </div>
    </div>
  );
}
