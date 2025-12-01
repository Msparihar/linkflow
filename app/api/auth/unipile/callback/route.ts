import { NextRequest, NextResponse } from 'next/server';

// In-memory store for account IDs (in production, use a database)
// Using global to persist across requests in development
declare global {
  var unipileAccounts: Record<string, string> | undefined;
}

global.unipileAccounts = global.unipileAccounts || {};

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    // Payload structure from Unipile:
    // {
    //   "status": "CREATION_SUCCESS" | "RECONNECTED",
    //   "account_id": "e54m8LR22bA7G5qsAc8w",
    //   "name": "myuser1234"  // Your internal user ID
    // }

    const { status, account_id, name: userId } = payload;

    console.log('Unipile callback received:', { status, account_id, userId });

    if (status === 'CREATION_SUCCESS' || status === 'RECONNECTED') {
      // Store the account_id linked to userId
      global.unipileAccounts![userId] = account_id;
      console.log(`User ${userId} connected LinkedIn account: ${account_id}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error handling Unipile callback:', error);
    return NextResponse.json(
      { error: 'Callback processing failed' },
      { status: 500 }
    );
  }
}

// GET endpoint for the callback page to retrieve and set the cookie
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId') || 'default-user';
  const accountId = global.unipileAccounts?.[userId];

  if (accountId) {
    const response = NextResponse.json({ account_id: accountId });
    // Set the cookie
    response.cookies.set('unipile_account_id', accountId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    return response;
  }

  return NextResponse.json({ account_id: null });
}
