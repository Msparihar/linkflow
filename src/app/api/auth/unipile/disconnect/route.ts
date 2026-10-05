import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { DISCONNECTED_COOKIE } from '@/lib/session';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;

    if (!userId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Keep unipileAccountId in the DB so we can reconnect instead of creating
    // a duplicate account; the marker hides it for this browser.
    cookieStore.delete('unipile_account_id');
    cookieStore.set(DISCONNECTED_COOKIE, '1', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting LinkedIn:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect' },
      { status: 500 }
    );
  }
}
