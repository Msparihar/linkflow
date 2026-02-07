import { NextRequest, NextResponse } from 'next/server';
import { getUnipileClient } from '@/lib/unipile';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    const client = getUnipileClient();

    // Generate expiration (1 hour from now)
    const expiresOn = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const response = await client.account.createHostedAuthLink({
      type: 'create',
      providers: ['LINKEDIN'],
      api_url: process.env.UNIPILE_API_URL!,
      expiresOn,
      success_redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?status=success`,
      failure_redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?status=failure`,
      notify_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/unipile/callback`,
      name: userId || 'default-user',
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
