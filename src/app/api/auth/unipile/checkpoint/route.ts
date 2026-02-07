import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUnipileClient } from '@/lib/unipile';

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

    const { account_id, code } = await request.json();

    if (!account_id || !code) {
      return NextResponse.json(
        { error: 'account_id and code are required' },
        { status: 400 }
      );
    }

    const client = getUnipileClient();
    const result = await client.account.solveCodeCheckpoint({
      provider: 'LINKEDIN',
      account_id,
      code,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Error solving checkpoint:', error);

    const err = error as { body?: Record<string, unknown>; message?: string };
    const body = err?.body;
    const message =
      (body?.detail as string) ||
      (body?.title as string) ||
      (body?.error as string) ||
      (body?.message as string) ||
      err?.message ||
      'Failed to verify code';

    console.error('Unipile error body:', JSON.stringify(body, null, 2));

    return NextResponse.json(
      { error: message, details: body },
      { status: 500 }
    );
  }
}
