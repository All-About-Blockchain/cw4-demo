'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { CHAIN_CONFIG } from '../config/chain';
import { DAO_CONFIG } from '../config/dao';
import { useRouter } from 'next/navigation';
import { useBackNavigation } from '../hooks/useBackNavigation';
import {
  useProposalDetails,
  ProposalDetails,
} from '../hooks/useProposalDetails';

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
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(
    null
  );
  const [selectedProposalModule, setSelectedProposalModule] = useState<
    string | null
  >(null);
  const [userVote, setUserVote] = useState<
    'yes' | 'no' | 'abstain' | 'veto' | null
  >(null);
  const [voting, setVoting] = useState(false);

  // Use the proposal details hook
  const {
    proposal: detailedProposal,
    loading: proposalDetailsLoading,
    error: proposalDetailsError,
    refetch: refetchProposalDetails,
  } = useProposalDetails(selectedProposal?.id || null, selectedProposalModule);

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
                            {proposal.status?.toUpperCase() || 'UNKNOWN'}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedProposal(proposal);
                          setSelectedProposalModule(
                            proposal.module_address || null
                          );
                        }}
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

              {proposalDetailsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600">
                    Loading proposal details...
                  </span>
                </div>
              ) : proposalDetailsError ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800">
                    Error loading proposal details: {proposalDetailsError}
                  </p>
                  <button
                    onClick={refetchProposalDetails}
                    className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900">Title</h4>
                    <p className="text-gray-600">
                      {detailedProposal?.title || selectedProposal.title}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900">Description</h4>
                    <p className="text-gray-600">
                      {detailedProposal?.description ||
                        selectedProposal.description ||
                        'No description provided'}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900">Proposal ID</h4>
                    <p className="text-gray-600 font-mono text-sm">
                      {detailedProposal?.id || selectedProposal.id || 'N/A'}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900">Proposer</h4>
                    <p className="text-gray-600 font-mono text-sm">
                      {detailedProposal?.proposer ||
                        selectedProposal.proposer ||
                        'N/A'}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900">Voting Period</h4>
                    <div className="text-gray-600 text-sm space-y-1">
                      <p>
                        Start:{' '}
                        {detailedProposal?.voting_start_time ||
                        selectedProposal.voting_start_time
                          ? new Date(
                              detailedProposal?.voting_start_time ||
                                selectedProposal.voting_start_time ||
                                ''
                            ).toLocaleString()
                          : 'N/A'}
                      </p>
                      <p>
                        End:{' '}
                        {detailedProposal?.voting_end_time ||
                        selectedProposal.voting_end_time
                          ? new Date(
                              detailedProposal?.voting_end_time ||
                                selectedProposal.voting_end_time ||
                                ''
                            ).toLocaleString()
                          : 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900">
                      Voting Threshold
                    </h4>
                    <p className="text-gray-600 text-sm">
                      {detailedProposal?.threshold || selectedProposal.threshold
                        ? JSON.stringify(
                            detailedProposal?.threshold ||
                              selectedProposal.threshold,
                            null,
                            2
                          )
                        : 'N/A'}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900">Status</h4>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        (detailedProposal?.status ||
                          selectedProposal.status) === 'passed'
                          ? 'bg-green-100 text-green-800'
                          : (detailedProposal?.status ||
                                selectedProposal.status) === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : (detailedProposal?.status ||
                                  selectedProposal.status) === 'open'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {(
                        detailedProposal?.status || selectedProposal.status
                      )?.toUpperCase() || 'UNKNOWN'}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900">
                      Execution Messages
                    </h4>
                    <div className="space-y-2">
                      {(
                        detailedProposal?.msgs ||
                        selectedProposal.msgs ||
                        []
                      ).map((msg, index) => (
                        <div key={index} className="bg-gray-50 p-3 rounded-lg">
                          <div className="text-sm font-medium text-gray-700 mb-2">
                            Message {index + 1}
                          </div>
                          <div className="text-xs text-gray-600 space-y-1">
                            {msg.wasm?.execute && (
                              <>
                                <p>
                                  <strong>Contract:</strong>{' '}
                                  {msg.wasm.execute.contract_addr}
                                </p>
                                <p>
                                  <strong>Message:</strong>
                                </p>
                                <pre className="bg-white p-2 rounded border text-xs overflow-x-auto">
                                  {JSON.stringify(
                                    msg.wasm.execute.msg,
                                    null,
                                    2
                                  )}
                                </pre>
                              </>
                            )}
                            {msg.bank?.send && (
                              <>
                                <p>
                                  <strong>Type:</strong> Bank Send
                                </p>
                                <p>
                                  <strong>To:</strong>{' '}
                                  {msg.bank.send.to_address}
                                </p>
                                <p>
                                  <strong>Amount:</strong>{' '}
                                  {JSON.stringify(msg.bank.send.amount)}
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                      {(!(detailedProposal?.msgs || selectedProposal.msgs) ||
                        (detailedProposal?.msgs || selectedProposal.msgs)
                          .length === 0) && (
                        <p className="text-gray-500 text-sm">
                          No execution messages
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900">
                      Voting Progress
                    </h4>
                    <div className="space-y-4">
                      {/* Vote Totals */}
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="bg-green-50 p-3 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">
                            {(detailedProposal?.votes || selectedProposal.votes)
                              ?.filter(v => v.vote === 'yes')
                              .reduce((sum, v) => sum + (v.weight || 0), 0) ||
                              0}
                          </div>
                          <div className="text-sm text-green-700">Yes</div>
                        </div>
                        <div className="bg-red-50 p-3 rounded-lg">
                          <div className="text-2xl font-bold text-red-600">
                            {(detailedProposal?.votes || selectedProposal.votes)
                              ?.filter(v => v.vote === 'no')
                              .reduce((sum, v) => sum + (v.weight || 0), 0) ||
                              0}
                          </div>
                          <div className="text-sm text-red-700">No</div>
                        </div>
                        <div className="bg-yellow-50 p-3 rounded-lg">
                          <div className="text-2xl font-bold text-yellow-600">
                            {(detailedProposal?.votes || selectedProposal.votes)
                              ?.filter(v => v.vote === 'abstain')
                              .reduce((sum, v) => sum + (v.weight || 0), 0) ||
                              0}
                          </div>
                          <div className="text-sm text-yellow-700">Abstain</div>
                        </div>
                      </div>

                      {/* Progress Bars */}
                      {(() => {
                        const votes =
                          detailedProposal?.votes ||
                          selectedProposal.votes ||
                          [];
                        const totalVotes = votes.reduce(
                          (sum, v) => sum + (v.weight || 0),
                          0
                        );
                        const yesVotes = votes
                          .filter(v => v.vote === 'yes')
                          .reduce((sum, v) => sum + (v.weight || 0), 0);
                        const noVotes = votes
                          .filter(v => v.vote === 'no')
                          .reduce((sum, v) => sum + (v.weight || 0), 0);
                        const abstainVotes = votes
                          .filter(v => v.vote === 'abstain')
                          .reduce((sum, v) => sum + (v.weight || 0), 0);

                        const yesPercent =
                          totalVotes > 0 ? (yesVotes / totalVotes) * 100 : 0;
                        const noPercent =
                          totalVotes > 0 ? (noVotes / totalVotes) * 100 : 0;
                        const abstainPercent =
                          totalVotes > 0
                            ? (abstainVotes / totalVotes) * 100
                            : 0;

                        return (
                          <div className="space-y-3">
                            {/* Yes Votes Bar */}
                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-green-700 font-medium">
                                  Yes
                                </span>
                                <span className="text-gray-600">
                                  {yesPercent.toFixed(1)}%
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-3">
                                <div
                                  className="bg-green-500 h-3 rounded-full transition-all duration-300"
                                  style={{ width: `${yesPercent}%` }}
                                ></div>
                              </div>
                            </div>

                            {/* No Votes Bar */}
                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-red-700 font-medium">
                                  No
                                </span>
                                <span className="text-gray-600">
                                  {noPercent.toFixed(1)}%
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-3">
                                <div
                                  className="bg-red-500 h-3 rounded-full transition-all duration-300"
                                  style={{ width: `${noPercent}%` }}
                                ></div>
                              </div>
                            </div>

                            {/* Abstain Votes Bar */}
                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-yellow-700 font-medium">
                                  Abstain
                                </span>
                                <span className="text-gray-600">
                                  {abstainPercent.toFixed(1)}%
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-3">
                                <div
                                  className="bg-yellow-500 h-3 rounded-full transition-all duration-300"
                                  style={{ width: `${abstainPercent}%` }}
                                ></div>
                              </div>
                            </div>

                            {/* Threshold Indicator */}
                            {(detailedProposal?.threshold ||
                              selectedProposal.threshold) && (
                              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                                <div className="flex justify-between text-sm mb-2">
                                  <span className="text-blue-700 font-medium">
                                    Threshold Required
                                  </span>
                                  <span className="text-gray-600">
                                    {(
                                      detailedProposal?.threshold ||
                                      selectedProposal.threshold
                                    ).absolute_count?.count ||
                                      (
                                        detailedProposal?.threshold ||
                                        selectedProposal.threshold
                                      ).quorum?.quorum ||
                                      'N/A'}
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                    style={{
                                      width: `${Math.min(100, (yesVotes / ((detailedProposal?.threshold || selectedProposal.threshold).absolute_count?.count || (detailedProposal?.threshold || selectedProposal.threshold).quorum?.quorum || 1)) * 100)}%`,
                                    }}
                                  ></div>
                                </div>
                                <div className="text-xs text-blue-600 mt-1">
                                  {yesVotes} /{' '}
                                  {(
                                    detailedProposal?.threshold ||
                                    selectedProposal.threshold
                                  ).absolute_count?.count ||
                                    (
                                      detailedProposal?.threshold ||
                                      selectedProposal.threshold
                                    ).quorum?.quorum ||
                                    'N/A'}{' '}
                                  votes
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900">
                      Individual Votes
                    </h4>
                    <div className="space-y-2">
                      {(
                        detailedProposal?.votes ||
                        selectedProposal.votes ||
                        []
                      ).map((vote, index) => (
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
                      {(!(detailedProposal?.votes || selectedProposal.votes) ||
                        (detailedProposal?.votes || selectedProposal.votes)
                          .length === 0) && (
                        <p className="text-gray-500 text-sm">No votes yet</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
