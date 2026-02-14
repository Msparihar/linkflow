import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

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

    // Only clear the session cookie — keep unipileAccountId in the DB
    // so we can reconnect instead of creating a duplicate account.
    cookieStore.delete('unipile_account_id');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting LinkedIn:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect' },
      { status: 500 }
    );
  }
}
