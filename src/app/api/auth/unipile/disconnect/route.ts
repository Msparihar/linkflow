import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

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

    // Clear unipile account from database
    await prisma.user.update({
      where: { id: userId },
      data: { unipileAccountId: null },
    });

    // Clear the cookie
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
