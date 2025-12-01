'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

function AuthCallbackContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get('status');
  const accountId = searchParams.get('account_id');
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (status === 'success' && accountId) {
      setRedirecting(true);

      // Call API to set the cookie with the account_id from URL
      const setSessionAndRedirect = async () => {
        try {
          const response = await fetch('/api/auth/unipile/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ account_id: accountId }),
          });

          if (response.ok) {
            window.location.href = '/dashboard';
          } else {
            console.error('Failed to set session');
          }
        } catch (error) {
          console.error('Error setting session:', error);
        }
      };

      setSessionAndRedirect();
    }
  }, [status, accountId]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {status === 'success' ? (
            <>
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-foreground">
                LinkedIn Connected!
              </CardTitle>
            </>
          ) : (
            <>
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-foreground">
                Connection Failed
              </CardTitle>
            </>
          )}
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === 'success' ? (
            <>
              <p className="text-muted-foreground">
                Your LinkedIn account has been successfully connected.
              </p>
              {redirecting && (
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Redirecting to dashboard...</span>
                </div>
              )}
            </>
          ) : (
            <>
              <p className="text-muted-foreground">
                Something went wrong while connecting your LinkedIn account.
                Please try again.
              </p>
              <Button
                onClick={() => (window.location.href = '/')}
                className="w-full"
              >
                Try Again
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="w-full max-w-md">
            <CardContent className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
