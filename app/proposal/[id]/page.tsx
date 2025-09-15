'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWallet } from '../../contexts/WalletContext';
import { DAO_CONFIG } from '../../config/dao';
import { CHAIN_CONFIG } from '../../config/chain';
import { useBackNavigation } from '../../hooks/useBackNavigation';
import {
  useProposalDetails,
  ProposalDetails,
  VoteInfo,
} from '../../hooks/useProposalDetails';

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

export default function ProposalDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { goBack } = useBackNavigation();
  const proposalId = params.id ? parseInt(params.id as string) : null;

  // Get module address from URL search params
  const [moduleAddress, setModuleAddress] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    setModuleAddress(urlParams.get('module'));
  }, []);

  const {
    address,
    isConnected,
    walletType,
    disconnect,
    balance,
    balanceLoading,
    refreshBalance,
  } = useWallet();

  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [voting, setVoting] = useState(false);

  // Use the proposal details hook
  const {
    proposal: detailedProposal,
    loading: proposalDetailsLoading,
    error: proposalDetailsError,
    refetch: refetchProposalDetails,
  } = useProposalDetails(proposalId, moduleAddress);

  // Fetch proposal data
  const fetchProposal = async () => {
    if (!proposalId) {
      setError('Invalid proposal ID');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `/api/dao/proposals?address=${DAO_CONFIG.address}`
      );
      if (!response.ok) throw new Error('Failed to fetch proposals');
      const data = await response.json();

      // Find the specific proposal
      const foundProposal = data.proposals?.find(
        (p: Proposal) => p.id === proposalId || p.proposal?.id === proposalId
      );

      if (foundProposal) {
        setProposal(foundProposal);
      } else {
        setError(`Proposal ${proposalId} not found`);
      }
    } catch (err: any) {
      console.error('Error fetching proposal:', err);
      setError(err.message);
    } finally {
      setLoading(false);
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

      // Refresh proposal details
      await refetchProposalDetails();
      await fetchProposal();
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

      // Refresh proposal details
      await refetchProposalDetails();
      await fetchProposal();
    } catch (err: any) {
      console.error('Error executing proposal:', err);
      setError(err.message);
    } finally {
      setVoting(false);
    }
  };

  useEffect(() => {
    fetchProposal();
  }, [proposalId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading proposal details...</p>
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
            onClick={() => router.push('/governance')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Governance
          </button>
        </div>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-600 text-xl mb-4">Proposal Not Found</div>
          <button
            onClick={() => router.push('/governance')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Governance
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
              onClick={() => router.push('/governance')}
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
              <span className="text-sm font-medium">Back to Governance</span>
            </button>
          </div>

          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Proposal #{proposal.id || proposal.proposal?.id}
              </h1>
              <p className="text-gray-600 mt-1">
                {proposal.title ||
                  proposal.proposal?.title ||
                  'Untitled Proposal'}
              </p>
            </div>
            <div className="relative">
              {isConnected ? (
                <div className="flex items-center space-x-3 bg-green-50 border border-green-200 rounded-lg p-4">
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
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
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
              <div className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Basic Information
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          Title
                        </label>
                        <p className="text-gray-900">
                          {detailedProposal?.title ||
                            proposal.title ||
                            proposal.proposal?.title ||
                            'Untitled Proposal'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          Description
                        </label>
                        <p className="text-gray-900">
                          {detailedProposal?.description ||
                            proposal.description ||
                            proposal.proposal?.description ||
                            'No description provided'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          Proposer
                        </label>
                        <p className="text-gray-900 font-mono text-sm">
                          {detailedProposal?.proposer ||
                            proposal.proposer ||
                            proposal.proposal?.proposer ||
                            'N/A'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          Status
                        </label>
                        <div className="flex items-center space-x-2">
                          <span
                            className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                              (detailedProposal?.status ||
                                proposal.status ||
                                proposal.proposal?.status) === 'passed'
                                ? 'bg-green-100 text-green-800'
                                : (detailedProposal?.status ||
                                      proposal.status ||
                                      proposal.proposal?.status) === 'rejected'
                                  ? 'bg-red-100 text-red-800'
                                  : (detailedProposal?.status ||
                                        proposal.status ||
                                        proposal.proposal?.status) === 'open'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {(
                              detailedProposal?.status ||
                              proposal.status ||
                              proposal.proposal?.status ||
                              'UNKNOWN'
                            ).toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Voting Period
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          Start Time
                        </label>
                        <p className="text-gray-900">
                          {(() => {
                            const startTime =
                              detailedProposal?.voting_start_time;
                            if (startTime) {
                              try {
                                // Handle both timestamp strings and nanoseconds
                                const time =
                                  startTime.length > 13
                                    ? new Date(parseInt(startTime) / 1000000) // Convert nanoseconds to milliseconds
                                    : new Date(startTime);
                                return time.toLocaleString();
                              } catch (e) {
                                return startTime;
                              }
                            }
                            return 'N/A';
                          })()}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          End Time
                        </label>
                        <p className="text-gray-900">
                          {(() => {
                            const endTime = detailedProposal?.voting_end_time;
                            if (endTime) {
                              try {
                                // Handle both timestamp strings and nanoseconds
                                const time =
                                  endTime.length > 13
                                    ? new Date(parseInt(endTime) / 1000000) // Convert nanoseconds to milliseconds
                                    : new Date(endTime);
                                return time.toLocaleString();
                              } catch (e) {
                                return endTime;
                              }
                            }
                            return 'N/A';
                          })()}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          Expires
                        </label>
                        <p className="text-gray-900">
                          {(() => {
                            const expires = detailedProposal?.expires;
                            if (expires?.at_time) {
                              try {
                                // Handle both timestamp strings and nanoseconds
                                const time =
                                  expires.at_time.length > 13
                                    ? new Date(
                                        parseInt(expires.at_time) / 1000000
                                      ) // Convert nanoseconds to milliseconds
                                    : new Date(expires.at_time);
                                return time.toLocaleString();
                              } catch (e) {
                                return expires.at_time;
                              }
                            } else if (expires?.at_height) {
                              return `At block ${expires.at_height}`;
                            }
                            return 'N/A';
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Voting Actions */}
                {(proposal.status || proposal.proposal?.status) === 'open' &&
                  isConnected && (
                    <div className="border-t pt-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Cast Your Vote
                      </h3>
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
                              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
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
                                : vote.charAt(0).toUpperCase() + vote.slice(1)}
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  )}

                {/* Execute Button */}
                {(proposal.status || proposal.proposal?.status) === 'passed' &&
                  isConnected && (
                    <div className="border-t pt-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Execute Proposal
                      </h3>
                      <button
                        onClick={() => {
                          const proposalId =
                            proposal.id || proposal.proposal?.id;
                          if (proposalId) {
                            executeProposal(proposalId);
                          }
                        }}
                        disabled={voting}
                        className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        {voting ? 'Executing...' : 'Execute Proposal'}
                      </button>
                    </div>
                  )}

                {/* Voting Progress */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Voting Progress
                  </h3>

                  {/* Vote Totals */}
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="bg-green-50 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {(detailedProposal?.voteTotals || [])
                          .filter(v => v.vote === 'yes')
                          .reduce((sum, v) => sum + (v.weight || 0), 0)}
                      </div>
                      <div className="text-sm text-green-700">Yes</div>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {(detailedProposal?.voteTotals || [])
                          .filter(v => v.vote === 'no')
                          .reduce((sum, v) => sum + (v.weight || 0), 0)}
                      </div>
                      <div className="text-sm text-red-700">No</div>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-yellow-600">
                        {(detailedProposal?.voteTotals || [])
                          .filter(v => v.vote === 'abstain')
                          .reduce((sum, v) => sum + (v.weight || 0), 0)}
                      </div>
                      <div className="text-sm text-yellow-700">Abstain</div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-gray-600">
                        {(() => {
                          const totalVotingPower =
                            detailedProposal?.total_power || 0;
                          const votedPower = (
                            detailedProposal?.voteTotals || []
                          ).reduce((sum, v) => sum + (v.weight || 0), 0);
                          return totalVotingPower - votedPower;
                        })()}
                      </div>
                      <div className="text-sm text-gray-700">Unvoted</div>
                    </div>
                  </div>

                  {/* Pie Chart */}
                  {(() => {
                    const voteTotals = detailedProposal?.voteTotals || [];
                    const totalVotingPower = detailedProposal?.total_power || 0;
                    const votedPower = voteTotals.reduce(
                      (sum, v) => sum + (v.weight || 0),
                      0
                    );
                    const yesVotes = voteTotals
                      .filter(v => v.vote === 'yes')
                      .reduce((sum, v) => sum + (v.weight || 0), 0);
                    const noVotes = voteTotals
                      .filter(v => v.vote === 'no')
                      .reduce((sum, v) => sum + (v.weight || 0), 0);
                    const abstainVotes = voteTotals
                      .filter(v => v.vote === 'abstain')
                      .reduce((sum, v) => sum + (v.weight || 0), 0);
                    const unvotedPower = totalVotingPower - votedPower;

                    // Calculate percentages based on total voting power
                    const yesPercent =
                      totalVotingPower > 0
                        ? (yesVotes / totalVotingPower) * 100
                        : 0;
                    const noPercent =
                      totalVotingPower > 0
                        ? (noVotes / totalVotingPower) * 100
                        : 0;
                    const abstainPercent =
                      totalVotingPower > 0
                        ? (abstainVotes / totalVotingPower) * 100
                        : 0;
                    const unvotedPercent =
                      totalVotingPower > 0
                        ? (unvotedPower / totalVotingPower) * 100
                        : 0;

                    // Calculate angles for pie chart
                    const yesAngle = (yesPercent / 100) * 360;
                    const noAngle = (noPercent / 100) * 360;
                    const abstainAngle = (abstainPercent / 100) * 360;
                    const unvotedAngle = (unvotedPercent / 100) * 360;

                    return (
                      <div className="flex items-center justify-center space-x-8 mb-6">
                        {/* Pie Chart */}
                        <div className="relative w-48 h-48">
                          <svg
                            className="w-full h-full transform -rotate-90"
                            viewBox="0 0 100 100"
                          >
                            {/* Yes votes */}
                            {yesPercent > 0 && (
                              <circle
                                cx="50"
                                cy="50"
                                r="40"
                                fill="none"
                                stroke="#10b981"
                                strokeWidth="20"
                                strokeDasharray={`${yesAngle * 2.51} 251.2`}
                                strokeDashoffset="0"
                              />
                            )}
                            {/* No votes */}
                            {noPercent > 0 && (
                              <circle
                                cx="50"
                                cy="50"
                                r="40"
                                fill="none"
                                stroke="#ef4444"
                                strokeWidth="20"
                                strokeDasharray={`${noAngle * 2.51} 251.2`}
                                strokeDashoffset={`-${yesAngle * 2.51}`}
                              />
                            )}
                            {/* Abstain votes */}
                            {abstainPercent > 0 && (
                              <circle
                                cx="50"
                                cy="50"
                                r="40"
                                fill="none"
                                stroke="#eab308"
                                strokeWidth="20"
                                strokeDasharray={`${abstainAngle * 2.51} 251.2`}
                                strokeDashoffset={`-${(yesAngle + noAngle) * 2.51}`}
                              />
                            )}
                            {/* Unvoted */}
                            {unvotedPercent > 0 && (
                              <circle
                                cx="50"
                                cy="50"
                                r="40"
                                fill="none"
                                stroke="#9ca3af"
                                strokeWidth="20"
                                strokeDasharray={`${unvotedAngle * 2.51} 251.2`}
                                strokeDashoffset={`-${(yesAngle + noAngle + abstainAngle) * 2.51}`}
                              />
                            )}
                          </svg>
                        </div>

                        {/* Legend */}
                        <div className="space-y-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                            <span className="text-sm font-medium text-gray-700">
                              Yes ({yesPercent.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                            <span className="text-sm font-medium text-gray-700">
                              No ({noPercent.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                            <span className="text-sm font-medium text-gray-700">
                              Abstain ({abstainPercent.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="w-4 h-4 bg-gray-400 rounded-full"></div>
                            <span className="text-sm font-medium text-gray-700">
                              Unvoted ({unvotedPercent.toFixed(1)}%)
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Threshold Indicator */}
                  {detailedProposal?.threshold &&
                    (() => {
                      const voteTotals = detailedProposal?.voteTotals || [];
                      const totalVotingPower =
                        detailedProposal?.total_power || 0;
                      const yesVotes = voteTotals
                        .filter(v => v.vote === 'yes')
                        .reduce((sum, v) => sum + (v.weight || 0), 0);

                      return (
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-blue-700 font-medium">
                              Threshold Required
                            </span>
                            <span className="text-gray-600">
                              {detailedProposal.threshold.absolute_count
                                ?.count ||
                                detailedProposal.threshold.quorum?.quorum ||
                                'N/A'}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                              style={{
                                width: `${Math.min(100, (yesVotes / (Number(detailedProposal.threshold.absolute_count?.count) || Number(detailedProposal.threshold.quorum?.quorum) || totalVotingPower)) * 100)}%`,
                              }}
                            ></div>
                          </div>
                          <div className="text-xs text-blue-600 mt-1">
                            {yesVotes} /{' '}
                            {detailedProposal.threshold.absolute_count?.count ||
                              detailedProposal.threshold.quorum?.quorum ||
                              totalVotingPower}{' '}
                            votes
                          </div>
                        </div>
                      );
                    })()}

                  {/* Individual Votes */}
                  <div className="mt-8">
                    <h4 className="font-medium text-gray-900 mb-4">
                      Individual Votes
                    </h4>
                    <div className="space-y-3">
                      {(detailedProposal?.votes || []).map((vote, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center bg-gray-50 p-4 rounded-lg border"
                        >
                          <div className="flex flex-col space-y-1">
                            {vote.voter === 'Vote Summary' ? (
                              <span className="font-mono text-sm font-semibold text-gray-900">
                                Aggregated Vote Count
                              </span>
                            ) : (
                              <span className="font-mono text-sm font-semibold text-gray-900">
                                {vote.voter}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-4">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                vote.vote === 'yes'
                                  ? 'bg-green-100 text-green-800'
                                  : vote.vote === 'no'
                                    ? 'bg-red-100 text-red-800'
                                    : vote.vote === 'abstain'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-purple-100 text-purple-800'
                              }`}
                            >
                              {vote.vote.toUpperCase()}
                            </span>
                            {vote.voter !== 'Vote Summary' &&
                              vote.weight > 0 && (
                                <span className="text-sm text-gray-900 font-semibold">
                                  {vote.weight}{' '}
                                  {vote.weight === 1 ? 'vote' : 'votes'}
                                </span>
                              )}
                          </div>
                        </div>
                      ))}
                      {(detailedProposal?.votes || []).length === 0 && (
                        <div className="text-center py-8">
                          <div className="text-gray-400 text-4xl mb-2">🗳️</div>
                          <p className="text-gray-500">No votes cast yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Execution Messages */}
                {(detailedProposal?.msgs || []).length > 0 && (
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Execution Messages
                    </h3>
                    <div className="space-y-3">
                      {(detailedProposal?.msgs || []).map((msg, index) => (
                        <div key={index} className="bg-gray-50 p-4 rounded-lg">
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
                                  {(() => {
                                    try {
                                      // Try to decode base64 message
                                      const decoded = atob(
                                        msg.wasm.execute.msg
                                      );
                                      const parsed = JSON.parse(decoded);
                                      return JSON.stringify(parsed, null, 2);
                                    } catch (e) {
                                      // If decoding fails, show raw message
                                      return msg.wasm.execute.msg;
                                    }
                                  })()}
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
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
