import { NextRequest, NextResponse } from 'next/server';
import { getNotes, getNote, updateNoteStatus } from '@/lib/store';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const userAccountId = searchParams.get('userAccountId');

  if (id) {
    const note = getNote(parseInt(id));
    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }
    return NextResponse.json({ notes: [note] });
  }

  const notes = getNotes(userAccountId ?? undefined);
  return NextResponse.json({ notes });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const noteId = body.noteId ?? body.id;
  const { status } = body;

  if (!noteId || !status) {
    return NextResponse.json(
      { error: 'noteId and status required' },
      { status: 400 }
    );
  }

  const note = updateNoteStatus(noteId, status);
  if (!note) {
    return NextResponse.json({ error: 'Note not found' }, { status: 404 });
  }

  return NextResponse.json(note);
}
