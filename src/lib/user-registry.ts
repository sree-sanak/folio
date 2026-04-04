// User registry — maps Dynamic auth users to Hedera accounts (Supabase-backed)

import { supabase } from './supabase';

export interface FolioUser {
  email: string;
  name: string;
  hederaAccountId: string;
  createdAt: string;
}

interface UserRow {
  email: string;
  name: string;
  hedera_account_id: string;
  created_at: string;
}

function rowToUser(row: UserRow): FolioUser {
  return {
    email: row.email,
    name: row.name,
    hederaAccountId: row.hedera_account_id,
    createdAt: row.created_at,
  };
}

export async function getUser(email: string): Promise<FolioUser | undefined> {
  const { data } = await supabase
    .from('users')
    .select()
    .eq('email', email.toLowerCase())
    .single();
  return data ? rowToUser(data) : undefined;
}

export async function registerUser(
  email: string,
  name: string,
  hederaAccountId: string
): Promise<FolioUser> {
  const key = email.toLowerCase();
  const { data, error } = await supabase
    .from('users')
    .upsert({
      email: key,
      name: name || email.split('@')[0],
      hedera_account_id: hederaAccountId,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToUser(data);
}

export async function searchUsers(query: string): Promise<FolioUser[]> {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const { data } = await supabase
    .from('users')
    .select()
    .or(`name.ilike.%${q}%,email.ilike.%${q}%`);
  return (data ?? []).map(rowToUser);
}

export async function getUserByAccountId(
  accountId: string
): Promise<FolioUser | undefined> {
  const { data } = await supabase
    .from('users')
    .select()
    .eq('hedera_account_id', accountId)
    .single();
  return data ? rowToUser(data) : undefined;
}

export async function getAllUsers(): Promise<FolioUser[]> {
  const { data } = await supabase.from('users').select();
  return (data ?? []).map(rowToUser);
}
