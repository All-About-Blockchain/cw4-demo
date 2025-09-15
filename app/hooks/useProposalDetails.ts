import { useState, useEffect, useCallback } from 'react';
import { CHAIN_CONFIG } from '../config/chain';

export interface ProposalDetails {
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
  msgs: ProposalMessage[];
  threshold: ProposalThreshold;
  votes: VoteInfo[];
  voteTotals: VoteInfo[];
  voting_start_time?: string;
  voting_end_time?: string;
  module_address: string;
  total_power?: number;
  quorum?: {
    quorum: string;
  };
}

export interface ProposalMessage {
  wasm?: {
    execute: {
      contract_addr: string;
      msg: any;
      funds?: any[];
    };
  };
  bank?: {
    send: {
      to_address: string;
      amount: any[];
    };
  };
  [key: string]: any;
}

export interface ProposalThreshold {
  absolute_count?: {
    count: number;
  };
  absolute_percentage?: {
    percentage: string;
  };
  threshold_quorum?: {
    threshold: string;
    quorum: string;
  };
  quorum?: {
    quorum: string;
  };
}

export interface VoteInfo {
  vote: 'yes' | 'no' | 'abstain' | 'veto';
  voter: string;
  weight: number;
  power?: number;
  txHash?: string;
}

interface UseProposalDetailsReturn {
  proposal: ProposalDetails | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useProposalDetails(
  proposalId: number | null,
  moduleAddress: string | null
): UseProposalDetailsReturn {
  const [proposal, setProposal] = useState<ProposalDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProposalDetails = useCallback(async () => {
    if (!proposalId || !moduleAddress) {
      setProposal(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log(
        `Fetching proposal ${proposalId} from module ${moduleAddress}`
      );

      // Get basic proposal details
      const proposalDetailMsg = {
        proposal: { proposal_id: proposalId },
      };
      const proposalDetailBase64 = Buffer.from(
        JSON.stringify(proposalDetailMsg)
      ).toString('base64');
      const proposalDetailUrl = `${CHAIN_CONFIG.restEndpoint}/cosmwasm/wasm/v1/contract/${moduleAddress}/smart/${proposalDetailBase64}`;

      const proposalDetailResponse = await fetch(proposalDetailUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!proposalDetailResponse.ok) {
        const errorText = await proposalDetailResponse.text();
        throw new Error(
          `Failed to fetch proposal details: ${proposalDetailResponse.status} - ${errorText}`
        );
      }

      const proposalDetailData = await proposalDetailResponse.json();
      const proposalDetail = proposalDetailData.data || proposalDetailData;

      // Handle nested proposal structure (DAO DAO format)
      const actualProposal = proposalDetail.proposal || proposalDetail;

      // Get votes for this proposal
      const votesMsg = {
        list_votes: {
          proposal_id: proposalId,
          limit: 100, // Adjust as needed
        },
      };
      const votesBase64 = Buffer.from(JSON.stringify(votesMsg)).toString(
        'base64'
      );
      const votesUrl = `${CHAIN_CONFIG.restEndpoint}/cosmwasm/wasm/v1/contract/${moduleAddress}/smart/${votesBase64}`;

      const votesResponse = await fetch(votesUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      let votes: VoteInfo[] = [];
      if (votesResponse.ok) {
        const votesData = await votesResponse.json();
        const individualVotes = votesData.data?.votes || votesData.votes || [];

        // If we have actual individual votes with voter addresses, use those
        if (individualVotes.length > 0 && individualVotes[0].voter) {
          votes = individualVotes.map((vote: any) => ({
            vote: vote.vote,
            voter: vote.voter,
            weight: vote.weight || 0,
            txHash: vote.tx_hash || vote.txHash || vote.transaction_hash, // Include transaction hash if available
          }));
          console.log('Individual votes from API:', individualVotes);
          console.log('Mapped votes:', votes);
        }
      }

      // For vote totals (pie chart), we need aggregated data regardless of individual votes
      let voteTotals: VoteInfo[] = [];

      // Try individual_votes first for totals
      if (actualProposal.individual_votes) {
        const individualVotes = actualProposal.individual_votes;

        // Convert individual votes to vote objects for totals
        if (individualVotes.yes && Number(individualVotes.yes) > 0) {
          voteTotals.push({
            vote: 'yes',
            voter: 'Vote Summary',
            weight: Number(individualVotes.yes),
          });
        }
        if (individualVotes.no && Number(individualVotes.no) > 0) {
          voteTotals.push({
            vote: 'no',
            voter: 'Vote Summary',
            weight: Number(individualVotes.no),
          });
        }
        if (individualVotes.abstain && Number(individualVotes.abstain) > 0) {
          voteTotals.push({
            vote: 'abstain',
            voter: 'Vote Summary',
            weight: Number(individualVotes.abstain),
          });
        }
      }
      // Fall back to aggregated votes for totals
      else if (actualProposal.votes) {
        const voteCounts = actualProposal.votes;

        // Convert aggregated votes to individual vote objects for totals
        if (voteCounts.yes && Number(voteCounts.yes) > 0) {
          voteTotals.push({
            vote: 'yes',
            voter: 'Vote Summary',
            weight: Number(voteCounts.yes),
          });
        }
        if (voteCounts.no && Number(voteCounts.no) > 0) {
          voteTotals.push({
            vote: 'no',
            voter: 'Vote Summary',
            weight: Number(voteCounts.no),
          });
        }
        if (voteCounts.abstain && Number(voteCounts.abstain) > 0) {
          voteTotals.push({
            vote: 'abstain',
            voter: 'Vote Summary',
            weight: Number(voteCounts.abstain),
          });
        }
      }

      // Get total voting power - try from proposal data first, then from voting module
      let totalPower = 0;

      // First, try to get total power from the proposal data itself
      if (actualProposal.total_power) {
        totalPower = Number(actualProposal.total_power);
      } else {
        // Fallback: try to get from voting module
        try {
          // Get voting module address from DAO
          const votingModuleMsg = { voting_module: {} };
          const votingModuleBase64 = Buffer.from(
            JSON.stringify(votingModuleMsg)
          ).toString('base64');
          const votingModuleUrl = `${CHAIN_CONFIG.restEndpoint}/cosmwasm/wasm/v1/contract/${moduleAddress}/smart/${votingModuleBase64}`;

          const votingModuleResponse = await fetch(votingModuleUrl, {
            method: 'GET',
            headers: { Accept: 'application/json' },
          });

          if (votingModuleResponse.ok) {
            const votingModuleData = await votingModuleResponse.json();
            const votingModule = votingModuleData.data;

            if (votingModule) {
              // Get total voting power from the voting module
              const totalPowerMsg = { total_power_at_height: { height: null } };
              const totalPowerBase64 = Buffer.from(
                JSON.stringify(totalPowerMsg)
              ).toString('base64');
              const totalPowerUrl = `${CHAIN_CONFIG.restEndpoint}/cosmwasm/wasm/v1/contract/${votingModule}/smart/${totalPowerBase64}`;

              const totalPowerResponse = await fetch(totalPowerUrl, {
                method: 'GET',
                headers: { Accept: 'application/json' },
              });

              if (totalPowerResponse.ok) {
                const totalPowerData = await totalPowerResponse.json();
                totalPower = totalPowerData.data?.power || 0;
              }
            }
          }
        } catch (err) {
          // Silent fallback
        }
      }

      // Parse expiration times
      let votingStartTime: string | undefined;
      let votingEndTime: string | undefined;

      // Try to get voting start time from the proposal data
      if (actualProposal.voting_start_time) {
        votingStartTime = actualProposal.voting_start_time;
      }

      // Try to get voting end time from the proposal data
      if (actualProposal.voting_end_time) {
        votingEndTime = actualProposal.voting_end_time;
      } else if (actualProposal.expires?.at_time) {
        votingEndTime = actualProposal.expires.at_time;
      }

      // Construct the complete proposal object
      const completeProposal: ProposalDetails = {
        id: actualProposal.id || proposalDetail.id,
        title:
          actualProposal.title ||
          `Proposal ${actualProposal.id || proposalDetail.id}`,
        description: actualProposal.description || 'No description provided',
        status: actualProposal.status || 'pending',
        proposer: actualProposal.proposer,
        expires: actualProposal.expires || {},
        msgs: actualProposal.msgs || [],
        threshold: actualProposal.threshold || {},
        votes: votes, // Individual votes for the individual votes section
        voteTotals: voteTotals, // Aggregated totals for pie chart and vote counts
        voting_start_time: votingStartTime,
        voting_end_time: votingEndTime,
        module_address: moduleAddress,
        total_power: totalPower,
        quorum: actualProposal.quorum,
      };

      setProposal(completeProposal);
    } catch (err: any) {
      console.error('Error fetching proposal details:', err);
      setError(err.message || 'Failed to fetch proposal details');
      setProposal(null);
    } finally {
      setLoading(false);
    }
  }, [proposalId, moduleAddress]);

  useEffect(() => {
    fetchProposalDetails();
  }, [fetchProposalDetails]);

  return {
    proposal,
    loading,
    error,
    refetch: fetchProposalDetails,
  };
}
