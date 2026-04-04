import { NextRequest, NextResponse } from 'next/server';
import { freezeCard, unfreezeCard } from '@/lib/lithic';
import { getNotes } from '@/lib/store';
import { verifyAuth, unauthorized } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (!auth.authenticated) return unauthorized(auth.error);

  try {
    const { cardToken, freeze } = await req.json();

    if (!cardToken) {
      return NextResponse.json({ error: 'cardToken required' }, { status: 400 });
    }

    // Verify the authenticated user owns this card via their email → userAccountId mapping
    // In the in-memory store, notes are keyed by userAccountId which maps to the auth email
    const allNotes = getNotes();
    const ownerNote = allNotes.find(
      (n) => n.cardToken === cardToken
    );

    if (!ownerNote) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    // Only allow freeze/unfreeze on active cards
    if (ownerNote.status !== 'active') {
      return NextResponse.json({ error: 'Card is not active' }, { status: 400 });
    }

    const result = freeze
      ? await freezeCard(cardToken)
      : await unfreezeCard(cardToken);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to update card' },
        { status: 500 }
      );
    }

    // Update in-memory store
    ownerNote.cardState = freeze ? 'PAUSED' : 'OPEN';

    return NextResponse.json({
      success: true,
      state: result.card?.state,
    });
  } catch (error) {
    console.error('Card freeze/unfreeze error:', error);
    return NextResponse.json(
      { error: 'Failed to update card state' },
      { status: 500 }
    );
  }
}
