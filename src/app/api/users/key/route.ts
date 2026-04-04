import { NextRequest, NextResponse } from 'next/server';
import { getUser, storeEncryptedKey } from '@/lib/user-registry';
import { verifyAuth, unauthorized } from '@/lib/auth';

// GET — fetch encrypted key blob for recovery on new device
export async function GET(req: NextRequest) {
  const auth = await verifyAuth(req);
  if (!auth.authenticated) return unauthorized(auth.error);

  const email = req.nextUrl.searchParams.get('email');
  if (!email) {
    return NextResponse.json({ error: 'email required' }, { status: 400 });
  }

  const user = await getUser(email);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (!user.encryptedKey || !user.keySalt || !user.keyIv) {
    return NextResponse.json({ hasEncryptedKey: false });
  }

  return NextResponse.json({
    hasEncryptedKey: true,
    encryptedKey: user.encryptedKey,
    keySalt: user.keySalt,
    keyIv: user.keyIv,
  });
}

// POST — store encrypted key after registration or passphrase setup
export async function POST(req: NextRequest) {
  const postAuth = await verifyAuth(req);
  if (!postAuth.authenticated) return unauthorized(postAuth.error);

  try {
    const { email, encryptedKey, keySalt, keyIv } = await req.json();

    if (!email || !encryptedKey || !keySalt || !keyIv) {
      return NextResponse.json(
        { error: 'email, encryptedKey, keySalt, keyIv required' },
        { status: 400 }
      );
    }

    const user = await getUser(email);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await storeEncryptedKey(email, encryptedKey, keySalt, keyIv);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Store encrypted key error:', error);
    return NextResponse.json(
      { error: 'Failed to store key', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
