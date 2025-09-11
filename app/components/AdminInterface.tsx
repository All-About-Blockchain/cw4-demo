'use client';

import { useEffect, useState } from 'react';
import { useAdmin } from '../contexts/AdminContext';
import { useWallet } from '../contexts/WalletContext';
import { CHAIN_CONFIG } from '../config/chain';
import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { GasPrice } from '@cosmjs/stargate';

// Use any type for Keplr to avoid type conflicts
const getKeplr = () => (window as any).keplr;

interface GroupMember {
  addr: string;
  weight: number;
}

interface MultisigMember {
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

  // Multisig creation state
  const [multisigType, setMultisigType] = useState<'fixed' | 'flex'>('fixed');
  const [multisigMembers, setMultisigMembers] = useState<MultisigMember[]>([]);
  const [newMemberAddr, setNewMemberAddr] = useState('');
  const [newMemberWeight, setNewMemberWeight] = useState(1);
  const [thresholdPercentage, setThresholdPercentage] = useState('0.5');
  const [maxVotingDays, setMaxVotingDays] = useState(7);
  const [votingDurationUnit, setVotingDurationUnit] = useState<
    'days' | 'hours'
  >('days');
  const [multisigLabel, setMultisigLabel] = useState('');
  const [multisigDescription, setMultisigDescription] = useState('');

  const handleCreateMultisig = async () => {
    if (multisigMembers.length === 0) {
      setStatus('Please add at least one member to the multisig');
      return;
    }

    // Check if Keplr is available
    const keplr = getKeplr();
    if (!keplr) {
      setStatus('Keplr wallet not found. Please install Keplr extension.');
      return;
    }

    setLoading(true);
    setStatus('Preparing transaction...');

    try {
      // Get unsigned transaction from backend
      const response = await fetch('/api/admin/create-multisig', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: multisigType,
          members: multisigMembers,
          thresholdPercentage,
          maxVotingSeconds:
            votingDurationUnit === 'hours'
              ? maxVotingDays * 60 * 60
              : maxVotingDays * 24 * 60 * 60,
          label: multisigLabel || `${multisigType}-multisig-${Date.now()}`,
          description:
            multisigDescription || `A ${multisigType} multisig contract`,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        setStatus(`Failed to prepare transaction: ${error.error}`);
        return;
      }

      const data = await response.json();

      if (!data.unsignedTx) {
        setStatus('Invalid response from server');
        return;
      }

      console.log('Received unsigned transaction:', data.unsignedTx);
      console.log('Debug info:', data.debug);

      setStatus('Please approve the transaction in Keplr...');

      // Get chain info and enable Keplr
      const chainId = data.unsignedTx.chainId;

      // Configure Keplr with chain info if needed
      console.log('Attempting to enable chain:', chainId);
      try {
        await keplr.enable(chainId);
        console.log('Chain enabled successfully');
      } catch (error) {
        console.log(
          'Chain not recognized by Keplr, attempting to suggest chain...',
          error
        );
        try {
          const chainInfo = {
            chainId: chainId,
            chainName: `Cosmos Hub Testnet`,
            rpc: CHAIN_CONFIG.rpcEndpoint,
            rest: CHAIN_CONFIG.restEndpoint,
            bip44: {
              coinType: 118,
            },
            bech32Config: {
              bech32PrefixAccAddr: CHAIN_CONFIG.prefix,
              bech32PrefixAccPub: `${CHAIN_CONFIG.prefix}pub`,
              bech32PrefixValAddr: `${CHAIN_CONFIG.prefix}valoper`,
              bech32PrefixValPub: `${CHAIN_CONFIG.prefix}valoperpub`,
              bech32PrefixConsAddr: `${CHAIN_CONFIG.prefix}valcons`,
              bech32PrefixConsPub: `${CHAIN_CONFIG.prefix}valconspub`,
            },
            currencies: [
              {
                coinDenom: CHAIN_CONFIG.token,
                coinMinimalDenom: CHAIN_CONFIG.baseDenom,
                coinDecimals: 6,
              },
            ],
            feeCurrencies: [
              {
                coinDenom: CHAIN_CONFIG.token,
                coinMinimalDenom: CHAIN_CONFIG.baseDenom,
                coinDecimals: 6,
                gasPriceStep: {
                  low: 0.01,
                  average: 0.025,
                  high: 0.03,
                },
              },
            ],
            stakeCurrency: {
              coinDenom: CHAIN_CONFIG.token,
              coinMinimalDenom: CHAIN_CONFIG.baseDenom,
              coinDecimals: 6,
            },
            features: ['stargate', 'ibc-transfer', 'cosmwasm'],
          };

          console.log('Suggesting chain with config:', chainInfo);
          await keplr.experimentalSuggestChain(chainInfo);
          console.log('Chain suggested successfully, now enabling...');
          await keplr.enable(chainId);
          console.log('Chain enabled after suggestion');
        } catch (suggestError) {
          console.error('Failed to suggest chain:', suggestError);
          setStatus(
            'Please add Cosmos Hub Testnet to Keplr manually. Go to Keplr settings and add chain with ID: ' +
              chainId
          );
          return;
        }
      }

      // Get offline signer
      console.log('Getting offline signer for chain:', chainId);
      const offlineSigner = await keplr.getOfflineSignerAuto(chainId);
      console.log('Offline signer obtained:', offlineSigner);

      // Get account info
      console.log('Getting accounts from offline signer...');
      console.log(
        'Offline signer methods:',
        Object.getOwnPropertyNames(offlineSigner)
      );
      console.log(
        'Offline signer prototype:',
        Object.getOwnPropertyNames(Object.getPrototypeOf(offlineSigner))
      );

      // Try different methods to get accounts
      let accounts;
      if (typeof offlineSigner.getAccounts === 'function') {
        accounts = await offlineSigner.getAccounts();
      } else if (typeof offlineSigner.getAccounts === 'function') {
        accounts = await offlineSigner.getAccounts();
      } else {
        // Fallback: get accounts directly from Keplr
        accounts = await keplr.getKey(chainId);
        accounts = [
          { address: accounts.bech32Address, pubkey: accounts.pubKey },
        ];
      }

      console.log('Accounts obtained:', accounts);
      const account = accounts[0];

      if (!account) {
        setStatus('No account found in Keplr');
        return;
      }

      // Get account info from chain
      const client = await SigningCosmWasmClient.connectWithSigner(
        CHAIN_CONFIG.rpcEndpoint,
        offlineSigner,
        {
          gasPrice: GasPrice.fromString(CHAIN_CONFIG.gasPrice),
        }
      );

      const accountInfo = await client.getAccount(account.address);

      if (!accountInfo) {
        setStatus('Account not found on chain');
        return;
      }

      // Update transaction with correct account info
      const tx = {
        ...data.unsignedTx,
        accountNumber: accountInfo.accountNumber.toString(),
        sequence: accountInfo.sequence.toString(),
      };

      // Sign and broadcast transaction
      setStatus('Signing transaction...');
      console.log('Signing transaction with:', {
        address: account.address,
        msgs: tx.msgs,
        fee: tx.fee,
        memo: tx.memo,
      });

      const result = await client.signAndBroadcast(
        account.address,
        tx.msgs,
        tx.fee,
        tx.memo
      );

      console.log('Transaction result:', result);

      if (result.code === 0) {
        // Extract contract address from transaction events
        const contractAddress = result.events
          .find(e => e.type === 'instantiate')
          ?.attributes.find(a => a.key === '_contract_address')?.value;

        if (contractAddress) {
          addMultisig?.(contractAddress);
          setStatus(`Created new ${multisigType} multisig: ${contractAddress}`);

          // Reset form
          setMultisigMembers([]);
          setNewMemberAddr('');
          setNewMemberWeight(1);
          setMultisigLabel('');
          setMultisigDescription('');
          setMaxVotingDays(7);
          setVotingDurationUnit('days');
        } else {
          setStatus(
            'Transaction successful but could not extract contract address'
          );
        }
      } else {
        setStatus(`Transaction failed: ${result.rawLog}`);
      }
    } catch (err: any) {
      console.error('Transaction error:', err);
      setStatus(`Error: ${err.message || 'Transaction failed'}`);
    } finally {
      setLoading(false);
    }
  };

  const addMultisigMember = () => {
    if (!newMemberAddr.trim()) {
      setStatus('Please enter a valid address');
      return;
    }

    if (newMemberWeight <= 0) {
      setStatus('Weight must be greater than 0');
      return;
    }

    // Check if address already exists
    if (multisigMembers.some(m => m.addr === newMemberAddr.trim())) {
      setStatus('Address already added to multisig');
      return;
    }

    setMultisigMembers([
      ...multisigMembers,
      {
        addr: newMemberAddr.trim(),
        weight: newMemberWeight,
      },
    ]);

    setNewMemberAddr('');
    setNewMemberWeight(1);
    setStatus('');
  };

  const removeMultisigMember = (index: number) => {
    setMultisigMembers(multisigMembers.filter((_, i) => i !== index));
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
          <div className="flex flex-col items-center gap-3">
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
            <span className="font-mono break-all px-2 py-1 rounded bg-white border text-blue-800">
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
          <h3 className="text-lg font-semibold text-green-800 mb-4">
            Create New Multisig
          </h3>

          {/* Multisig Type Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-green-700 mb-2">
              Multisig Type
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="fixed"
                  checked={multisigType === 'fixed'}
                  onChange={e =>
                    setMultisigType(e.target.value as 'fixed' | 'flex')
                  }
                  className="mr-2"
                />
                <span className="text-sm text-green-700">Fixed Multisig</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="flex"
                  checked={multisigType === 'flex'}
                  onChange={e =>
                    setMultisigType(e.target.value as 'fixed' | 'flex')
                  }
                  className="mr-2"
                />
                <span className="text-sm text-green-700">Flex Multisig</span>
              </label>
            </div>
            <p className="text-xs text-green-600 mt-1">
              {multisigType === 'fixed'
                ? 'Fixed set of members defined at creation'
                : 'Dynamic membership managed through CW4 group contract'}
            </p>
          </div>

          {/* Multisig Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Label (optional)
              </label>
              <input
                type="text"
                placeholder="My Multisig"
                value={multisigLabel}
                onChange={e => setMultisigLabel(e.target.value)}
                className="px-3 py-2 border rounded w-full text-sm text-gray-800"
              />
              <p className="text-xs text-gray-500 mt-1">
                Custom name to identify this multisig contract
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (optional)
              </label>
              <input
                type="text"
                placeholder="Description of this multisig"
                value={multisigDescription}
                onChange={e => setMultisigDescription(e.target.value)}
                className="px-3 py-2 border rounded w-full text-sm text-gray-800"
              />
              <p className="text-xs text-gray-500 mt-1">
                Brief description of the multisig's purpose
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Threshold (%)
              </label>
              <input
                type="number"
                min="0.01"
                max="1"
                step="0.01"
                placeholder="0.5"
                value={thresholdPercentage}
                onChange={e => setThresholdPercentage(e.target.value)}
                className="px-3 py-2 border rounded w-full text-sm text-gray-800"
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimum percentage of total voting power required to pass
                proposals (0.5 = 50%)
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Voting Duration
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  max={votingDurationUnit === 'hours' ? 8760 : 365}
                  value={maxVotingDays}
                  onChange={e => setMaxVotingDays(Number(e.target.value))}
                  className="flex-1 px-3 py-2 border rounded text-sm text-gray-800"
                />
                <select
                  value={votingDurationUnit}
                  onChange={e =>
                    setVotingDurationUnit(e.target.value as 'days' | 'hours')
                  }
                  className="px-3 py-2 border rounded text-sm text-gray-800 bg-white"
                >
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                </select>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Maximum time allowed for voting on proposals before they expire
              </p>
            </div>
          </div>

          {/* Add Members */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add Members
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="Wallet address (e.g., juno1...)"
                value={newMemberAddr}
                onChange={e => setNewMemberAddr(e.target.value)}
                className="flex-1 px-3 py-2 border rounded text-sm text-gray-800"
              />
              <input
                type="number"
                min="1"
                placeholder="Weight"
                value={newMemberWeight}
                onChange={e => setNewMemberWeight(Number(e.target.value))}
                className="w-20 px-3 py-2 border rounded text-sm text-gray-800"
              />
              <button
                onClick={addMultisigMember}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
              >
                Add
              </button>
            </div>
          </div>

          {/* Members List */}
          {multisigMembers.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Multisig Members ({multisigMembers.length})
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {multisigMembers.map((member, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-white p-2 rounded border"
                  >
                    <div className="flex-1">
                      <div className="text-sm font-mono text-gray-800">
                        {member.addr}
                      </div>
                      <div className="text-xs text-gray-500">
                        Weight: {member.weight}
                      </div>
                    </div>
                    <button
                      onClick={() => removeMultisigMember(index)}
                      className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Create Button */}
          <button
            onClick={handleCreateMultisig}
            disabled={loading || multisigMembers.length === 0}
            className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : `Create ${multisigType} Multisig`}
          </button>
        </div>

        {/* Existing Multisigs */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Existing Multisigs
          </h3>
          {multisigs?.length ? (
            <div className="space-y-2">
              {multisigs.map((m, i) => {
                const fromEnvCurrent = process.env.NEXT_PUBLIC_CW4_ADDR === m;
                const badge = fromEnvCurrent
                  ? {
                      label: 'CW4 (Active)',
                      cls: 'bg-indigo-100 text-indigo-800',
                    }
                  : { label: 'Stored', cls: 'bg-gray-100 text-gray-800' };
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono break-all text-gray-800">
                        {m}
                      </span>
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
            <p className="text-gray-600 text-sm">No multisigs created yet</p>
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
