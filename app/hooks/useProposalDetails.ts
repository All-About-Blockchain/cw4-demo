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

      console.log('Proposal detail data:', proposalDetail);

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
        votes = votesData.data?.votes || votesData.votes || [];
        console.log('Votes data:', votes);
      } else {
        console.warn('Failed to fetch votes:', votesResponse.status);
      }

      // Get voting power information
      const votingPowerMsg = {
        voting_power_at_height: {
          address: proposalDetail.proposer,
          height: null, // Current height
        },
      };
      const votingPowerBase64 = Buffer.from(
        JSON.stringify(votingPowerMsg)
      ).toString('base64');
      const votingPowerUrl = `${CHAIN_CONFIG.restEndpoint}/cosmwasm/wasm/v1/contract/${moduleAddress}/smart/${votingPowerBase64}`;

      let totalPower = 0;
      try {
        const votingPowerResponse = await fetch(votingPowerUrl, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
        });

        if (votingPowerResponse.ok) {
          const votingPowerData = await votingPowerResponse.json();
          totalPower = votingPowerData.data?.power || 0;
        }
      } catch (err) {
        console.warn('Failed to fetch voting power:', err);
      }

      // Parse expiration times
      let votingStartTime: string | undefined;
      let votingEndTime: string | undefined;

      if (proposalDetail.expires?.at_time) {
        votingEndTime = proposalDetail.expires.at_time;
      }

      // Try to get voting start time from the proposal data
      if (proposalDetail.voting_start_time) {
        votingStartTime = proposalDetail.voting_start_time;
      }

      // Construct the complete proposal object
      const completeProposal: ProposalDetails = {
        id: proposalDetail.id,
        title: proposalDetail.title || `Proposal ${proposalDetail.id}`,
        description: proposalDetail.description || 'No description provided',
        status: proposalDetail.status || 'pending',
        proposer: proposalDetail.proposer,
        expires: proposalDetail.expires || {},
        msgs: proposalDetail.msgs || [],
        threshold: proposalDetail.threshold || {},
        votes: votes,
        voting_start_time: votingStartTime,
        voting_end_time: votingEndTime,
        module_address: moduleAddress,
        total_power: totalPower,
        quorum: proposalDetail.quorum,
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
