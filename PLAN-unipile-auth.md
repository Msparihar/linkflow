# Plan: Unipile LinkedIn Authentication

## Overview
Integrate Unipile's Hosted Auth Wizard to allow users to connect their LinkedIn accounts securely.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Your App      │     │  Your Backend   │     │    Unipile      │
│   (Frontend)    │────▶│   (API Route)   │────▶│      API        │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │ 1. Click "Connect     │ 2. Generate hosted    │
        │    LinkedIn"          │    auth link          │
        │                       │◀──────────────────────│
        │ 3. Redirect user      │    Return URL         │
        │    to Unipile         │                       │
        │──────────────────────────────────────────────▶│
        │                       │                       │
        │                       │ 4. User authenticates │
        │                       │    with LinkedIn      │
        │                       │                       │
        │ 5. Redirect back      │◀──────────────────────│
        │◀──────────────────────│    notify_url called  │
        │    (success_url)      │    with account_id    │
        │                       │                       │
        │                       │ 6. Store account_id   │
        │                       │    linked to user     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Environment Variables Required

```env
UNIPILE_API_URL=https://apiXXX.unipile.com:XXX
UNIPILE_API_KEY=your_api_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Implementation Steps

### Step 1: Backend API Route - Generate Auth Link

Create an API route that generates the Unipile hosted auth link.

**File:** `app/api/auth/unipile/link/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    // Generate expiration (1 hour from now)
    const expiresOn = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const response = await fetch(
      `${process.env.UNIPILE_API_URL}/api/v1/hosted/accounts/link`,
      {
        method: 'POST',
        headers: {
          'X-API-KEY': process.env.UNIPILE_API_KEY!,
          'accept': 'application/json',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          type: 'create',
          providers: ['LINKEDIN'],
          api_url: process.env.UNIPILE_API_URL,
          expiresOn,
          success_redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?status=success`,
          failure_redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?status=failure`,
          notify_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/unipile/callback`,
          name: userId, // Your internal user ID
        }),
      }
    );

    const data = await response.json();

    return NextResponse.json({ url: data.url });
  } catch (error) {
    console.error('Error generating Unipile link:', error);
    return NextResponse.json(
      { error: 'Failed to generate auth link' },
      { status: 500 }
    );
  }
}
```

### Step 2: Backend API Route - Handle Callback

Receive the webhook when user successfully connects.

**File:** `app/api/auth/unipile/callback/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    // Payload structure:
    // {
    //   "status": "CREATION_SUCCESS",
    //   "account_id": "e54m8LR22bA7G5qsAc8w",
    //   "name": "myuser1234"  // Your internal user ID
    // }

    const { status, account_id, name: userId } = payload;

    if (status === 'CREATION_SUCCESS') {
      // TODO: Store the account_id linked to userId in your database
      // Example: await db.user.update({
      //   where: { id: userId },
      //   data: { unipileAccountId: account_id }
      // });

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
```

### Step 3: Frontend - Connect Button Component

**File:** `components/ConnectLinkedIn.tsx`

```typescript
'use client';

import { useState } from 'react';

export function ConnectLinkedIn({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    setLoading(true);

    try {
      const response = await fetch('/api/auth/unipile/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const { url } = await response.json();

      // Redirect to Unipile's hosted auth wizard
      window.location.href = url;
    } catch (error) {
      console.error('Failed to get auth link:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleConnect}
      disabled={loading}
      className="bg-blue-600 text-white px-4 py-2 rounded"
    >
      {loading ? 'Loading...' : 'Connect LinkedIn'}
    </button>
  );
}
```

### Step 4: Callback Page

**File:** `app/auth/callback/page.tsx`

```typescript
'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export default function AuthCallback() {
  const searchParams = useSearchParams();
  const status = searchParams.get('status');

  useEffect(() => {
    // Optionally poll or wait for webhook to complete
    // Then redirect to dashboard
    if (status === 'success') {
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);
    }
  }, [status]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      {status === 'success' ? (
        <div>
          <h1>LinkedIn Connected Successfully!</h1>
          <p>Redirecting to dashboard...</p>
        </div>
      ) : (
        <div>
          <h1>Connection Failed</h1>
          <p>Please try again.</p>
          <a href="/settings">Go back to settings</a>
        </div>
      )}
    </div>
  );
}
```

### Step 5: Handle Reconnection (When Credentials Expire)

**File:** `app/api/auth/unipile/reconnect/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { userId, accountId } = await request.json();

    const expiresOn = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const response = await fetch(
      `${process.env.UNIPILE_API_URL}/api/v1/hosted/accounts/link`,
      {
        method: 'POST',
        headers: {
          'X-API-KEY': process.env.UNIPILE_API_KEY!,
          'accept': 'application/json',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          type: 'reconnect',
          reconnect_account: accountId,
          api_url: process.env.UNIPILE_API_URL,
          expiresOn,
          success_redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?status=success`,
          failure_redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?status=failure`,
          notify_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/unipile/callback`,
          name: userId,
        }),
      }
    );

    const data = await response.json();

    return NextResponse.json({ url: data.url });
  } catch (error) {
    console.error('Error generating reconnect link:', error);
    return NextResponse.json(
      { error: 'Failed to generate reconnect link' },
      { status: 500 }
    );
  }
}
```

## Database Schema Addition

Add to your user model to store the Unipile account connection:

```prisma
model User {
  id                String   @id @default(cuid())
  // ... existing fields
  unipileAccountId  String?  // Store the Unipile account_id
  linkedInConnected Boolean  @default(false)
  linkedInConnectedAt DateTime?
}
```

## Security Considerations

1. **Never expose API key on frontend** - All Unipile API calls must go through your backend
2. **Validate webhook origin** - Consider adding webhook signature verification
3. **Short-lived auth links** - Set expiration to 1 hour or less
4. **HTTPS only** - Ensure all URLs use HTTPS in production

## Testing Checklist

- [ ] Generate hosted auth link successfully
- [ ] User redirected to Unipile auth wizard
- [ ] LinkedIn authentication completes
- [ ] Webhook callback received with account_id
- [ ] User redirected back to app after success
- [ ] account_id stored in database
- [ ] Reconnection flow works for expired credentials

## Next Steps After Auth

Once authenticated, you can:
1. Fetch user's LinkedIn chats: `GET /api/v1/chats`
2. Send messages: `POST /api/v1/chats/{chat_id}/messages`
3. Get connections: Check Unipile docs for connections endpoint
