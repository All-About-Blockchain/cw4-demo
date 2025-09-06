'use client';

import { useState, useEffect } from 'react';

interface Proposal {
  id: number;
  title: string;
  description: string;
  status: 'open' | 'passed' | 'rejected' | 'executed';
  votes: {
    yes: number;
    no: number;
    abstain: number;
  };
  endTime: string;
}

export default function GovernancePage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch actual proposals from CW3/CW4 contracts
    // Simulate loading proposals
    setTimeout(() => {
      setProposals([
        {
          id: 1,
          title: 'Update Protocol Parameters',
          description:
            'Proposal to update key protocol parameters for better efficiency.',
          status: 'open',
          votes: { yes: 150, no: 25, abstain: 10 },
          endTime: '2024-01-15T23:59:59Z',
        },
        {
          id: 2,
          title: 'Community Fund Allocation',
          description:
            'Allocate 10,000 tokens to community development initiatives.',
          status: 'passed',
          votes: { yes: 200, no: 50, abstain: 15 },
          endTime: '2024-01-10T23:59:59Z',
        },
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-green-100 text-green-800';
      case 'passed':
        return 'bg-blue-100 text-blue-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'executed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading proposals...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-800">
          Governance Proposals
        </h1>

        <div className="space-y-6">
          {proposals.map(proposal => (
            <div
              key={proposal.id}
              className="bg-white rounded-lg shadow-md p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-semibold text-gray-800">
                  {proposal.title}
                </h2>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(proposal.status)}`}
                >
                  {proposal.status.toUpperCase()}
                </span>
              </div>

              <p className="text-gray-600 mb-4">{proposal.description}</p>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {proposal.votes.yes}
                  </div>
                  <div className="text-sm text-gray-500">Yes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {proposal.votes.no}
                  </div>
                  <div className="text-sm text-gray-500">No</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">
                    {proposal.votes.abstain}
                  </div>
                  <div className="text-sm text-gray-500">Abstain</div>
                </div>
              </div>

              <div className="text-sm text-gray-500">
                Ends: {new Date(proposal.endTime).toLocaleDateString()}
              </div>

              {proposal.status === 'open' && (
                <div className="mt-4 flex space-x-3">
                  <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
                    Vote Yes
                  </button>
                  <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
                    Vote No
                  </button>
                  <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition">
                    Abstain
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
