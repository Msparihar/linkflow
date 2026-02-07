"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Linkedin, Loader2, LinkIcon, CheckCircle } from "lucide-react"

export function LinkedinConnectPrompt() {
  const [connecting, setConnecting] = useState(false)

  const handleConnect = async () => {
    setConnecting(true)

    try {
      const response = await fetch('/api/auth/unipile/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        console.error('Failed to get auth link:', data.error)
        alert('Failed to connect to LinkedIn. Please try again.')
      }
    } catch (error) {
      console.error('Failed to get auth link:', error)
      alert('Failed to connect to LinkedIn. Please try again.')
    } finally {
      setConnecting(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
      <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
        <Linkedin className="w-10 h-10 text-primary" />
      </div>
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Connect Your LinkedIn</h1>
        <p className="text-muted-foreground max-w-md">
          Connect your LinkedIn account to search through your connections and send personalized messages.
        </p>
      </div>

      <Button
        size="lg"
        onClick={handleConnect}
        disabled={connecting}
        className="h-12 px-8"
      >
        {connecting ? (
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
        ) : (
          <LinkIcon className="w-5 h-5 mr-2" />
        )}
        {connecting ? 'Connecting...' : 'Connect LinkedIn Account'}
      </Button>

      <div className="flex items-center gap-6 text-sm text-muted-foreground mt-8">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span>Secure connection</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span>Read-only access</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span>Disconnect anytime</span>
        </div>
      </div>
    </div>
  )
}
