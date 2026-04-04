import { NextRequest, NextResponse } from 'next/server';
import { getNote } from '@/lib/spend-notes';
import { verifyAuth, unauthorized } from '@/lib/auth';
import { getUser } from '@/lib/user-registry';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAuth(req);
  if (!auth.authenticated) return unauthorized(auth.error);

  const user = await getUser(auth.email);
  if (!user?.hederaAccountId) {
    return NextResponse.json({ error: 'Note not found' }, { status: 404 });
  }

  const { id } = await params;
  const note = await getNote(parseInt(id));

  if (!note || note.userAccountId !== user.hederaAccountId) {
    return NextResponse.json({ error: 'Note not found' }, { status: 404 });
  }

  return NextResponse.json({ note });
}
