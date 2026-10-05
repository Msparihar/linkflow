"use client"

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"
import { ApiError, errorMessage } from "@/lib/api-client"

// A signed-out session can't be fixed by retrying; send the user to sign in again.
function handleAuthError(error: unknown): boolean {
  if (error instanceof ApiError && error.status === 401 && error.code !== "LINKEDIN_NOT_CONNECTED") {
    window.location.href = "/login"
    return true
  }
  return false
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: (error, query) => {
            if (handleAuthError(error)) return
            // Queries with data on screen keep showing it; say the refresh failed.
            if (query.state.data !== undefined) {
              toast.error(errorMessage(error))
            }
          },
        }),
        mutationCache: new MutationCache({
          onError: (error, _variables, _context, mutation) => {
            if (handleAuthError(error)) return
            // Mutations with their own onError already show the message inline.
            if (mutation.options.onError) return
            toast.error(errorMessage(error))
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
            // Retrying a 4xx never helps, and three silent retries left pages spinning.
            retry: (failureCount, error) => {
              if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false
              return failureCount < 1
            },
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
