import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUnipileClient } from '@/lib/unipile';
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

    const client = getUnipileClient();
    const expiresOn = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    // Check if this user already has a Unipile account (e.g. after disconnect)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { unipileAccountId: true },
    });

    const existingAccountId = user?.unipileAccountId;

    // The user comes back from LinkedIn with the same account id, so recheck it then.
    cookieStore.delete(DISCONNECTED_COOKIE);
    if (existingAccountId) forgetLinkedinHealth(existingAccountId);

    const baseParams = {
      api_url: process.env.UNIPILE_API_URL!,
      expiresOn,
      success_redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?status=success`,
      failure_redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?status=failure`,
      notify_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/unipile/callback`,
      name: userId,
    } as const;

    const createLink = () =>
      client.account.createHostedAuthLink({
        ...baseParams,
        type: 'create',
        providers: ['LINKEDIN'],
      });

    let response;
    if (existingAccountId) {
      try {
        response = await client.account.createHostedAuthLink({
          ...baseParams,
          type: 'reconnect',
          reconnect_account: existingAccountId,
        });
      } catch (error) {
        // The saved account no longer exists in this Unipile workspace (deleted, or the
        // API key moved to another workspace). Forget it and start a fresh connection.
        console.warn('Reconnect failed, falling back to a new connection:', error);
        await prisma.user.update({
          where: { id: userId },
          data: { unipileAccountId: null },
        });
        response = await createLink();
      }
    } else {
      response = await createLink();
    }

    return NextResponse.json({ url: response.url });
  } catch (error) {
    console.error('Error generating Unipile link:', error);
    return NextResponse.json(
      { error: 'Failed to generate auth link' },
      { status: 500 }
    );
  }
}
