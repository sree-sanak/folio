// In-memory store for spend notes (hackathon — no database)
// In production this would be a database

export interface SpendNote {
  id: number;
  symbol: string; // stock symbol used as collateral
  serial: number; // NFT serial on Hedera
  recipient: string;
  recipientName: string;
  amount: number;
  shares: number;
  sharesHts: number;
  stockPrice: number;
  floor: number;
  cap: number;
  durationMonths: number;
  expiryDate: string;
  status: 'active' | 'repaid' | 'expired';
  txId: string;
  createdAt: string;
  userAccountId: string;
}

const notes: SpendNote[] = [];
let nextId = 1;

export function addNote(note: Omit<SpendNote, 'id'>): SpendNote {
  const newNote = { ...note, id: nextId++ };
  notes.push(newNote);
  return newNote;
}

export function getNotes(userAccountId?: string): SpendNote[] {
  if (userAccountId) {
    return notes.filter((n) => n.userAccountId === userAccountId);
  }
  return [...notes];
}

export function getNote(id: number): SpendNote | undefined {
  return notes.find((n) => n.id === id);
}

export function updateNoteStatus(
  id: number,
  status: SpendNote['status']
): SpendNote | undefined {
  const note = notes.find((n) => n.id === id);
  if (note) note.status = status;
  return note;
}
