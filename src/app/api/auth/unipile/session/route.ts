import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { DISCONNECTED_COOKIE, forgetLinkedinHealth } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;

    if (!userId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { account_id } = await request.json();

    if (!account_id) {
      return NextResponse.json(
        { error: 'account_id is required' },
        { status: 400 }
      );
    }

    // Update user's unipileAccountId in database
    await prisma.user.update({
      where: { id: userId },
      data: { unipileAccountId: account_id },
    });

    forgetLinkedinHealth(account_id);
    cookieStore.delete(DISCONNECTED_COOKIE);

    const response = NextResponse.json({ success: true });

    // Set the cookie
    response.cookies.set('unipile_account_id', account_id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (error) {
    console.error('Error setting session:', error);
    return NextResponse.json(
      { error: 'Failed to set session' },
      { status: 500 }
    );
  }
}
