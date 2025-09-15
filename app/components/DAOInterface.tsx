'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { CHAIN_CONFIG } from '../config/chain';
import { DAO_CONFIG } from '../config/dao';
import { useRouter } from 'next/navigation';
import { useBackNavigation } from '../hooks/useBackNavigation';

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
  module_address?: string;
  voting_start_time?: string;
  voting_end_time?: string;
  // DAO DAO specific fields
  proposal?: {
    id: number;
    title: string;
    description: string;
    proposer: string;
    status: string;
    expires: any;
    msgs: any[];
    threshold: any;
    votes: VoteInfo[];
    voting_start_time?: string;
    voting_end_time?: string;
  };
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
  const {
    address,
    isConnected,
    walletType,
    disconnect,
    balance,
    balanceLoading,
    refreshBalance,
  } = useWallet();
  const router = useRouter();
  const { goBack } = useBackNavigation();
  const [showWalletDropdown, setShowWalletDropdown] = useState(false);
  const [daoInfo, setDaoInfo] = useState<DAOInfo | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [userVote, setUserVote] = useState<
    'yes' | 'no' | 'abstain' | 'veto' | null
  >(null);
  const [voting, setVoting] = useState(false);
  const [showCreateProposal, setShowCreateProposal] = useState(false);
  const [creatingProposal, setCreatingProposal] = useState(false);
  const [proposalForm, setProposalForm] = useState({
    title: '',
    description: '',
  });

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

  // Create a new proposal
  const createProposal = async () => {
    if (!address) {
      setError('Please connect your wallet first');
      return;
    }

    if (!proposalForm.title.trim() || !proposalForm.description.trim()) {
      setError('Title and description are required');
      return;
    }

    setCreatingProposal(true);
    try {
      // Create a simple text proposal with no execution messages
      const messages: any[] = [];

      const response = await fetch('/api/dao/create-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: proposalForm.title,
          description: proposalForm.description,
          messages,
          daoAddress: DAO_CONFIG.address,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create proposal');
      }

      const result = await response.json();
      console.log('Proposal created:', result);

      // Reset form and close modal
      setProposalForm({
        title: '',
        description: '',
      });
      setShowCreateProposal(false);
      setError('');

      // Refresh proposals to show the new one
      await fetchProposals();
    } catch (err: any) {
      console.error('Error creating proposal:', err);
      setError(err.message);
    } finally {
      setCreatingProposal(false);
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showWalletDropdown) {
        const target = event.target as Element;
        if (!target.closest('.wallet-dropdown')) {
          setShowWalletDropdown(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showWalletDropdown]);

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
          {/* Back Button */}
          <div className="pt-4 pb-2">
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
            <div className="relative">
              {isConnected ? (
                <div className="relative wallet-dropdown">
                  <button
                    onClick={() => setShowWalletDropdown(!showWalletDropdown)}
                    className="flex items-center space-x-3 bg-green-50 border border-green-200 rounded-lg p-4 hover:bg-green-100 transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <div
                        className={`w-3 h-3 rounded-full transition-all duration-300 ${
                          balanceLoading
                            ? 'bg-yellow-500 animate-pulse'
                            : 'bg-green-500'
                        }`}
                      ></div>
                      <div className="text-left">
                        <p className="text-sm font-medium text-green-800">
                          {walletType} Wallet
                        </p>
                        <p className="text-xs text-green-600 font-mono">
                          {address?.slice(0, 8)}...{address?.slice(-6)}
                        </p>
                      </div>
                    </div>
                    <svg
                      className={`w-4 h-4 text-green-600 transition-transform ${
                        showWalletDropdown ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {showWalletDropdown && (
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50 animate-in slide-in-from-top-2 duration-200">
                      <div className="p-4 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">
                          Wallet Details
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Full address
                        </p>
                        <p className="text-xs font-mono text-gray-700 bg-gray-50 p-2 rounded mt-2 break-all">
                          {address}
                        </p>

                        {/* Balance Section */}
                        <div className="mt-4">
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-gray-500">Balance</p>
                            <button
                              onClick={refreshBalance}
                              disabled={balanceLoading}
                              className={`text-xs transition-all duration-200 ${
                                balanceLoading
                                  ? 'text-gray-400 cursor-not-allowed'
                                  : 'text-blue-600 hover:text-blue-800'
                              }`}
                            >
                              <svg
                                className={`w-3 h-3 inline mr-1 transition-transform duration-200 ${
                                  balanceLoading ? 'animate-spin' : ''
                                }`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                />
                              </svg>
                              {balanceLoading ? 'Loading...' : 'Refresh'}
                            </button>
                          </div>
                          <div className="relative">
                            <div
                              className={`text-sm font-mono text-gray-800 bg-gray-50 p-2 rounded mt-1 transition-all duration-300 ${
                                balanceLoading
                                  ? 'opacity-60 animate-pulse'
                                  : 'opacity-100'
                              }`}
                            >
                              {balanceLoading ? (
                                <div className="flex items-center space-x-2">
                                  <div className="flex space-x-1">
                                    <div
                                      className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"
                                      style={{ animationDelay: '0ms' }}
                                    ></div>
                                    <div
                                      className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"
                                      style={{ animationDelay: '150ms' }}
                                    ></div>
                                    <div
                                      className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"
                                      style={{ animationDelay: '300ms' }}
                                    ></div>
                                  </div>
                                  <span className="text-gray-500">
                                    Loading balance...
                                  </span>
                                </div>
                              ) : (
                                <span className="transition-opacity duration-300">
                                  {balance || 'No balance data'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="p-2">
                        <button
                          onClick={() => {
                            disconnect();
                            setShowWalletDropdown(false);
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <div className="flex items-center space-x-2">
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                              />
                            </svg>
                            <span>Disconnect</span>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => router.push('/login')}
                  className="flex items-center space-x-2 bg-yellow-50 border border-yellow-200 rounded-lg p-4 hover:bg-yellow-100 transition-colors"
                >
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-yellow-800">
                      Wallet not connected
                    </p>
                    <p className="text-xs text-yellow-600">Click to connect</p>
                  </div>
                  <svg
                    className="w-4 h-4 text-yellow-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </button>
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
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Proposals
                </h2>
                <p className="text-gray-600 mt-1">
                  View and vote on governance proposals
                </p>
              </div>
              {isConnected && (
                <button
                  onClick={() => setShowCreateProposal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  <span>Create Proposal</span>
                </button>
              )}
            </div>
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
                          #{proposal.id || proposal.proposal?.id}{' '}
                          {proposal.title ||
                            proposal.proposal?.title ||
                            'Untitled Proposal'}
                        </h3>
                        <p className="text-gray-600 mb-3">
                          {proposal.description ||
                            proposal.proposal?.description ||
                            'No description provided'}
                        </p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500 mb-2">
                          <span>
                            Proposed by:{' '}
                            <code className="bg-gray-100 px-2 py-1 rounded">
                              {proposal.proposer ||
                                proposal.proposal?.proposer ||
                                'Unknown'}
                            </code>
                          </span>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              (proposal.status || proposal.proposal?.status) ===
                              'passed'
                                ? 'bg-green-100 text-green-800'
                                : (proposal.status ||
                                      proposal.proposal?.status) === 'rejected'
                                  ? 'bg-red-100 text-red-800'
                                  : (proposal.status ||
                                        proposal.proposal?.status) === 'open'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {(
                              proposal.status ||
                              proposal.proposal?.status ||
                              'UNKNOWN'
                            ).toUpperCase()}
                          </span>
                        </div>

                        {/* Additional blockchain data */}
                        <div className="flex items-center space-x-4 text-xs text-gray-400">
                          {(proposal.voting_end_time ||
                            proposal.proposal?.voting_end_time) && (
                            <span>
                              Ends:{' '}
                              {new Date(
                                (proposal.voting_end_time ||
                                  proposal.proposal?.voting_end_time)!
                              ).toLocaleDateString()}
                            </span>
                          )}
                          {((proposal.votes && proposal.votes.length > 0) ||
                            (proposal.proposal?.votes &&
                              proposal.proposal.votes.length > 0)) && (
                            <span>
                              {proposal.votes?.length ||
                                proposal.proposal?.votes?.length ||
                                0}{' '}
                              vote
                              {(proposal.votes?.length ||
                                proposal.proposal?.votes?.length ||
                                0) !== 1
                                ? 's'
                                : ''}
                            </span>
                          )}
                          {(proposal.expires?.at_time ||
                            proposal.proposal?.expires?.at_time) && (
                            <span>
                              Expires:{' '}
                              {new Date(
                                (proposal.expires?.at_time ||
                                  proposal.proposal?.expires?.at_time)!
                              ).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const proposalId =
                            proposal.id || proposal.proposal?.id;
                          const moduleAddress = proposal.module_address;
                          if (proposalId && moduleAddress) {
                            router.push(
                              `/proposal/${proposalId}?module=${moduleAddress}`
                            );
                          }
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      >
                        View Details
                      </button>
                    </div>

                    {/* Voting buttons for open proposals */}
                    {(proposal.status || proposal.proposal?.status) ===
                      'open' &&
                      isConnected && (
                        <div className="border-t border-gray-200 pt-4">
                          <p className="text-sm text-gray-600 mb-3">
                            Cast your vote:
                          </p>
                          <div className="flex space-x-3">
                            {(['yes', 'no', 'abstain', 'veto'] as const).map(
                              vote => (
                                <button
                                  key={vote}
                                  onClick={() => {
                                    const proposalId =
                                      proposal.id || proposal.proposal?.id;
                                    if (proposalId) {
                                      voteOnProposal(proposalId, vote);
                                    }
                                  }}
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
                    {(proposal.status || proposal.proposal?.status) ===
                      'passed' &&
                      isConnected && (
                        <div className="border-t border-gray-200 pt-4">
                          <button
                            onClick={() => {
                              const proposalId =
                                proposal.id || proposal.proposal?.id;
                              if (proposalId) {
                                executeProposal(proposalId);
                              }
                            }}
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
      </div>

      {/* Create Proposal Modal */}
      {showCreateProposal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-semibold text-gray-900">
                  Create New Proposal
                </h3>
                <button
                  onClick={() => setShowCreateProposal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    value={proposalForm.title}
                    onChange={e =>
                      setProposalForm({
                        ...proposalForm,
                        title: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter proposal title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={proposalForm.description}
                    onChange={e =>
                      setProposalForm({
                        ...proposalForm,
                        description: e.target.value,
                      })
                    }
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Describe your proposal in detail"
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800">{error}</p>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setShowCreateProposal(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createProposal}
                    disabled={
                      creatingProposal ||
                      !proposalForm.title.trim() ||
                      !proposalForm.description.trim()
                    }
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {creatingProposal ? 'Creating...' : 'Create Proposal'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
