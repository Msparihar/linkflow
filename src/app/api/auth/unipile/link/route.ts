import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUnipileClient } from '@/lib/unipile';
import { prisma } from '@/lib/prisma';

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

    const baseParams = {
      api_url: process.env.UNIPILE_API_URL!,
      expiresOn,
      success_redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?status=success`,
      failure_redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?status=failure`,
      notify_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/unipile/callback`,
      name: userId,
    } as const;

    const response = existingAccountId
      ? await client.account.createHostedAuthLink({
          ...baseParams,
          type: 'reconnect',
          reconnect_account: existingAccountId,
        })
      : await client.account.createHostedAuthLink({
          ...baseParams,
          type: 'create',
          providers: ['LINKEDIN'],
        });

    return NextResponse.json({ url: response.url });
  } catch (error) {
    console.error('Error generating Unipile link:', error);
    return NextResponse.json(
      { error: 'Failed to generate auth link' },
      { status: 500 }
    );
  }
}
