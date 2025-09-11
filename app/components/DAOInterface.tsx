'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { CHAIN_CONFIG } from '../config/chain';
import { DAO_CONFIG } from '../config/dao';

interface Proposal {
  id: number;
  title: string;
  description: string;
  status: 'pending' | 'open' | 'rejected' | 'passed' | 'executed';
  proposer: string;
  expires: {
    at_height?: number;
    at_time?: string;
    never?: {};
  };
  msgs: any[];
  threshold: any;
  votes: VoteInfo[];
}

interface VoteInfo {
  vote: 'yes' | 'no' | 'abstain' | 'veto';
  voter: string;
  weight: number;
}

interface DAOInfo {
  name: string;
  description: string;
  voting_module: string;
  proposal_modules: string[];
  admin?: string;
}

export default function DAOInterface() {
  const { address, isConnected, walletType } = useWallet();
  const [daoInfo, setDaoInfo] = useState<DAOInfo | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(
    null
  );
  const [userVote, setUserVote] = useState<
    'yes' | 'no' | 'abstain' | 'veto' | null
  >(null);
  const [voting, setVoting] = useState(false);

  // Fetch DAO information
  const fetchDAOInfo = async () => {
    try {
      const response = await fetch(
        `/api/dao/info?address=${DAO_CONFIG.address}`
      );
      if (!response.ok) throw new Error('Failed to fetch DAO info');
      const data = await response.json();
      setDaoInfo(data);
    } catch (err: any) {
      console.error('Error fetching DAO info:', err);
      setError(err.message);
    }
  };

  // Fetch proposals
  const fetchProposals = async () => {
    try {
      const response = await fetch(
        `/api/dao/proposals?address=${DAO_CONFIG.address}`
      );
      if (!response.ok) throw new Error('Failed to fetch proposals');
      const data = await response.json();
      setProposals(data.proposals || []);
    } catch (err: any) {
      console.error('Error fetching proposals:', err);
      setError(err.message);
    }
  };

  // Vote on a proposal
  const voteOnProposal = async (
    proposalId: number,
    vote: 'yes' | 'no' | 'abstain' | 'veto'
  ) => {
    if (!address) {
      setError('Please connect your wallet first');
      return;
    }

    setVoting(true);
    try {
      const response = await fetch('/api/dao/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          daoAddress: DAO_CONFIG.address,
          proposalId,
          vote,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to vote');
      }

      setUserVote(vote);
      // Refresh proposals to show updated vote
      await fetchProposals();
    } catch (err: any) {
      console.error('Error voting:', err);
      setError(err.message);
    } finally {
      setVoting(false);
    }
  };

  // Execute a proposal
  const executeProposal = async (proposalId: number) => {
    if (!address) {
      setError('Please connect your wallet first');
      return;
    }

    setVoting(true);
    try {
      const response = await fetch('/api/dao/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          daoAddress: DAO_CONFIG.address,
          proposalId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to execute proposal');
      }

      // Refresh proposals to show updated status
      await fetchProposals();
    } catch (err: any) {
      console.error('Error executing proposal:', err);
      setError(err.message);
    } finally {
      setVoting(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchDAOInfo(), fetchProposals()]);
      setLoading(false);
    };

    if (DAO_CONFIG.address) {
      loadData();
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading DAO information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">Error</div>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {daoInfo?.name || DAO_CONFIG.name}
              </h1>
              <p className="text-gray-600 mt-1">
                {daoInfo?.description || DAO_CONFIG.description}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                DAO Address:{' '}
                <code className="bg-gray-100 px-2 py-1 rounded">
                  {DAO_CONFIG.address}
                </code>
              </p>
            </div>
            <div className="text-right">
              {isConnected ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800">
                    Connected with {walletType}
                  </p>
                  <p className="text-xs text-green-600 font-mono">{address}</p>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    Wallet not connected
                  </p>
                  <p className="text-xs text-yellow-600">
                    Connect to vote on proposals
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Proposals Section */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Proposals</h2>
            <p className="text-gray-600 mt-1">
              View and vote on governance proposals
            </p>
          </div>

          <div className="p-6">
            {proposals.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">📋</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No proposals yet
                </h3>
                <p className="text-gray-600">
                  This DAO hasn't created any proposals yet.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {proposals.map(proposal => (
                  <div
                    key={proposal.id}
                    className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          #{proposal.id} {proposal.title}
                        </h3>
                        <p className="text-gray-600 mb-3">
                          {proposal.description}
                        </p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>
                            Proposed by:{' '}
                            <code className="bg-gray-100 px-2 py-1 rounded">
                              {proposal.proposer}
                            </code>
                          </span>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              proposal.status === 'passed'
                                ? 'bg-green-100 text-green-800'
                                : proposal.status === 'rejected'
                                  ? 'bg-red-100 text-red-800'
                                  : proposal.status === 'open'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {proposal.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedProposal(proposal)}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      >
                        View Details
                      </button>
                    </div>

                    {/* Voting buttons for open proposals */}
                    {proposal.status === 'open' && isConnected && (
                      <div className="border-t border-gray-200 pt-4">
                        <p className="text-sm text-gray-600 mb-3">
                          Cast your vote:
                        </p>
                        <div className="flex space-x-3">
                          {(['yes', 'no', 'abstain', 'veto'] as const).map(
                            vote => (
                              <button
                                key={vote}
                                onClick={() =>
                                  voteOnProposal(proposal.id, vote)
                                }
                                disabled={voting}
                                className={`px-4 py-2 rounded font-medium transition-colors ${
                                  vote === 'yes'
                                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                    : vote === 'no'
                                      ? 'bg-red-100 text-red-800 hover:bg-red-200'
                                      : vote === 'abstain'
                                        ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                                        : 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                                } disabled:opacity-50`}
                              >
                                {voting
                                  ? 'Voting...'
                                  : vote.charAt(0).toUpperCase() +
                                    vote.slice(1)}
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    {/* Execute button for passed proposals */}
                    {proposal.status === 'passed' && isConnected && (
                      <div className="border-t border-gray-200 pt-4">
                        <button
                          onClick={() => executeProposal(proposal.id)}
                          disabled={voting}
                          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
                        >
                          {voting ? 'Executing...' : 'Execute Proposal'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Proposal Details Modal */}
        {selectedProposal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Proposal #{selectedProposal.id}
                  </h3>
                  <button
                    onClick={() => setSelectedProposal(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900">Title</h4>
                    <p className="text-gray-600">{selectedProposal.title}</p>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900">Description</h4>
                    <p className="text-gray-600">
                      {selectedProposal.description}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900">Status</h4>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        selectedProposal.status === 'passed'
                          ? 'bg-green-100 text-green-800'
                          : selectedProposal.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : selectedProposal.status === 'open'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {selectedProposal.status.toUpperCase()}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900">Votes</h4>
                    <div className="space-y-2">
                      {selectedProposal.votes.map((vote, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center bg-gray-50 p-2 rounded"
                        >
                          <span className="font-mono text-sm">
                            {vote.voter}
                          </span>
                          <div className="flex items-center space-x-2">
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                vote.vote === 'yes'
                                  ? 'bg-green-100 text-green-800'
                                  : vote.vote === 'no'
                                    ? 'bg-red-100 text-red-800'
                                    : vote.vote === 'abstain'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-purple-100 text-purple-800'
                              }`}
                            >
                              {vote.vote}
                            </span>
                            <span className="text-sm text-gray-600">
                              {vote.weight}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
