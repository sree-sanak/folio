import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, unauthorized } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (!auth.authenticated) {
    return unauthorized(auth.error);
  }

  try {
    const { evmAddress } = await req.json();

    if (!evmAddress || typeof evmAddress !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(evmAddress)) {
      return NextResponse.json({ error: 'Invalid EVM address' }, { status: 400 });
    }

    const { error } = await supabase
      .from('users')
      .update({ evm_wallet_address: evmAddress })
      .eq('email', auth.email);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Store EVM wallet error:', error);
    return NextResponse.json(
      { error: 'Failed to store EVM wallet address' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (!auth.authenticated) {
    return unauthorized(auth.error);
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('evm_wallet_address')
      .eq('email', auth.email)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ evmAddress: data?.evm_wallet_address || null });
  } catch (error) {
    console.error('Fetch EVM wallet error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch EVM wallet address' },
      { status: 500 }
    );
  }
}
