import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUnipileClient, findExistingLinkedinAccount } from '@/lib/unipile';
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

    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    const client = getUnipileClient();

    // Check if this user already has a Unipile account to reconnect
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { unipileAccountId: true },
    });

    // First check user's own account, then check all Unipile accounts by username
    const existingAccountId =
      user?.unipileAccountId || (await findExistingLinkedinAccount(username));

    const result = existingAccountId
      ? await client.account.reconnectLinkedin({ username, password, account_id: existingAccountId })
      : await client.account.connectLinkedin({ username, password });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Error connecting LinkedIn:', error);

    // Unipile SDK throws errors with a `body` property containing details
    const err = error as { body?: Record<string, unknown>; message?: string };
    const body = err?.body;
    const message =
      (body?.detail as string) ||
      (body?.title as string) ||
      (body?.error as string) ||
      (body?.message as string) ||
      err?.message ||
      'Failed to connect LinkedIn account';

    console.error('Unipile error body:', JSON.stringify(body, null, 2));

    return NextResponse.json(
      { error: message, details: body },
      { status: 500 }
    );
  }
}
