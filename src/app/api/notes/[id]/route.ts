import { NextRequest, NextResponse } from 'next/server';
import { getNote } from '@/lib/store';
import { verifyAuth, unauthorized } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAuth(req);
  if (!auth.authenticated) return unauthorized(auth.error);

  const { id } = await params;
  const note = getNote(parseInt(id));

  if (!note) {
    return NextResponse.json({ error: 'Note not found' }, { status: 404 });
  }

  return NextResponse.json({ note });
}
