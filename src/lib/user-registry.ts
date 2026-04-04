// User registry — maps Dynamic auth users to Hedera accounts (Supabase-backed)

import { supabase } from './supabase';

export interface FolioUser {
  email: string;
  name: string;
  hederaAccountId: string;
  publicKey?: string;
  encryptedKey?: string;
  keySalt?: string;
  keyIv?: string;
  createdAt: string;
}

interface UserRow {
  email: string;
  name: string;
  hedera_account_id: string;
  public_key: string | null;
  encrypted_key: string | null;
  key_salt: string | null;
  key_iv: string | null;
  created_at: string;
}

function rowToUser(row: UserRow): FolioUser {
  return {
    email: row.email,
    name: row.name,
    hederaAccountId: row.hedera_account_id,
    publicKey: row.public_key ?? undefined,
    encryptedKey: row.encrypted_key ?? undefined,
    keySalt: row.key_salt ?? undefined,
    keyIv: row.key_iv ?? undefined,
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
  hederaAccountId: string,
  publicKey?: string
): Promise<FolioUser> {
  const key = email.toLowerCase();
  const row: Record<string, string> = {
    email: key,
    name: name || email.split('@')[0],
    hedera_account_id: hederaAccountId,
  };
  if (publicKey) row.public_key = publicKey;
  const { data, error } = await supabase
    .from('users')
    .upsert(row)
    .select()
    .single();
  if (error) throw error;
  return rowToUser(data);
}

export async function storeEncryptedKey(
  email: string,
  encryptedKey: string,
  keySalt: string,
  keyIv: string
): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({
      encrypted_key: encryptedKey,
      key_salt: keySalt,
      key_iv: keyIv,
    })
    .eq('email', email.toLowerCase());
  if (error) throw error;
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
