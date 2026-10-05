"use client"

import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ApiError, errorMessage } from "@/lib/api-client"

type ErrorStateProps = {
  title?: string
  error?: unknown
  onRetry?: () => void
  retrying?: boolean
}

// Shown in place of a list when its query fails, so the page never spins forever.
export function ErrorState({ title = "Couldn't load this", error, onRetry, retrying }: ErrorStateProps) {
  // Reloading lands on the reconnect screen, since the server now knows the link is dead.
  if (error instanceof ApiError && error.code === "LINKEDIN_DISCONNECTED") {
    return (
      <div role="alert" className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="size-6" />
        </div>
        <div className="space-y-1">
          <p className="font-medium text-foreground">LinkedIn signed you out</p>
          <p className="text-sm text-muted-foreground max-w-sm">
            Reconnect your LinkedIn account to keep using search, messages and connections.
          </p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          Reconnect LinkedIn
        </Button>
      </div>
    )
  }

  return (
    <div role="alert" className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="size-6" />
      </div>
      <div className="space-y-1">
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground max-w-sm">{errorMessage(error)}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} disabled={retrying}>
          <RefreshCw className={retrying ? "animate-spin" : undefined} />
          Try again
        </Button>
      )}
    </div>
  )
}
