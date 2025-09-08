import { NextRequest, NextResponse } from 'next/server';
import { CHAIN_CONFIG } from '../../../config/chain';
import { Tendermint34Client } from '@cosmjs/tendermint-rpc';
import { QueryClient, setupBankExtension } from '@cosmjs/stargate';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get('address');
    if (!address) {
      return NextResponse.json(
        { error: 'address is required' },
        { status: 400 }
      );
    }

    // Try REST first
    try {
      const url = `${CHAIN_CONFIG.restEndpoint}/cosmos/bank/v1beta1/balances/${address}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const coins: Array<{ denom: string; amount: string }> =
          data?.balances || [];
        const base = coins.find(c => c.denom === CHAIN_CONFIG.baseDenom);
        if (base) {
          return NextResponse.json({
            amount: base.amount,
            denom: CHAIN_CONFIG.baseDenom,
          });
        }
      }
    } catch {}

    // Fallback to RPC query if REST failed or returned nothing
    try {
      const tm = await Tendermint34Client.connect(CHAIN_CONFIG.rpcEndpoint);
      const qc = QueryClient.withExtensions(tm, setupBankExtension);
      const coin = await qc.bank.balance(address, CHAIN_CONFIG.baseDenom);
      return NextResponse.json({
        amount: coin.amount ?? '0',
        denom: CHAIN_CONFIG.baseDenom,
      });
    } catch {
      return NextResponse.json({ amount: '0', denom: CHAIN_CONFIG.baseDenom });
    }
  } catch (e) {
    return NextResponse.json({ amount: '0', denom: CHAIN_CONFIG.baseDenom });
  }
}
