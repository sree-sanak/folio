import { NextRequest, NextResponse } from 'next/server';
import { searchUsers } from '@/lib/user-registry';

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q') || '';

  if (query.length < 2) {
    return NextResponse.json({ users: [] });
  }

  const users = await searchUsers(query);

  // Don't expose private keys — only return safe fields
  const safe = users.map((u) => ({
    email: u.email,
    name: u.name,
    hederaAccountId: u.hederaAccountId,
  }));

  return NextResponse.json({ users: safe });
}
