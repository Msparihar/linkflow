"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Building2, Loader2, Linkedin, Send, Unlink, AlertCircle, CheckCircle2 } from "lucide-react"

interface Organization {
  urn: string
  id: string
  name: string
  role: string
}

interface CompanyStatus {
  connected: boolean
  scope?: string
  expiresAt?: string
  hasRefreshToken?: boolean
  refreshExpiresAt?: string | null
  organizations?: Organization[]
  error?: string
}

const ERROR_MESSAGES: Record<string, string> = {
  unauthorized_scope_error:
    "LinkedIn refused the company page permissions. The LinkedIn app needs the Community Management API product approved in the developer portal.",
  user_cancelled_login: "LinkedIn sign-in was cancelled.",
  user_cancelled_authorize: "LinkedIn sign-in was cancelled.",
  invalid_state: "The sign-in link expired. Please try again.",
  token_exchange_failed: "LinkedIn sign-in worked, but getting the token failed. Please try again.",
  no_code: "LinkedIn did not return a sign-in code. Please try again.",
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—"
}

export function CompanyPanel() {
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const [selectedOrg, setSelectedOrg] = useState("")
  const [text, setText] = useState("")
  const [postResult, setPostResult] = useState<string | null>(null)

  const oauthError = searchParams.get("error")
  const oauthDetail = searchParams.get("detail")
  const justConnected = searchParams.get("connected") === "1"

  const { data: status, isLoading } = useQuery({
    queryKey: ["company-status"],
    queryFn: async () => {
      const res = await fetch("/api/linkedin/company")
      if (!res.ok) throw new Error("Failed to load status")
      return (await res.json()) as CompanyStatus
    },
  })

  const organizations = status?.organizations || []

  useEffect(() => {
    if (!selectedOrg && organizations.length > 0) setSelectedOrg(organizations[0].urn)
  }, [organizations, selectedOrg])

  const postMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/linkedin/company/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organization: selectedOrg, text }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to post")
      return data as { postUrn: string | null }
    },
    onSuccess: (data) => {
      setText("")
      setPostResult(data.postUrn)
    },
  })

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/linkedin/company", { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to disconnect")
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["company-status"] }),
  })

  const handlePost = () => {
    const org = organizations.find((o) => o.urn === selectedOrg)
    if (!org || !text.trim()) return
    if (!confirm(`Publish this post publicly on ${org.name}?`)) return
    setPostResult(null)
    postMutation.mutate()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Company Page</h2>
        {status?.connected && (
          <Button
            variant="ghost"
            onClick={() => confirm("Remove the saved LinkedIn page token?") && disconnectMutation.mutate()}
            disabled={disconnectMutation.isPending}
          >
            <Unlink className="w-4 h-4 mr-2" />
            Disconnect
          </Button>
        )}
      </div>

      {oauthError && (
        <Card className="border-destructive/50">
          <CardContent className="flex gap-3 py-4">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p>{ERROR_MESSAGES[oauthError] || `LinkedIn sign-in failed: ${oauthError}`}</p>
              {oauthDetail && <p className="text-muted-foreground mt-1">{oauthDetail}</p>}
            </div>
          </CardContent>
        </Card>
      )}

      {!status?.connected ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center max-w-md">
              Sign in with a LinkedIn account that is an admin of your company page. The token is
              saved so posts can go out without signing in each time.
            </p>
            <Button className="mt-4" asChild>
              <a href="/api/auth/linkedin/start">
                <Linkedin className="w-4 h-4 mr-2" />
                Connect company page
              </a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                {justConnected ? "Connected just now" : "Connected"}
              </CardTitle>
              <CardDescription>
                Token valid until {formatDate(status.expiresAt)}.{" "}
                {status.hasRefreshToken
                  ? `Renews on its own until ${formatDate(status.refreshExpiresAt)}.`
                  : "No refresh token, so you will need to sign in again before then."}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-1">
              <p>Scopes: {status.scope || "—"}</p>
              {status.error && <p className="text-destructive">{status.error}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Post as a page</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {organizations.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No company pages found where this account is an admin or content admin.
                </p>
              ) : (
                <>
                  <div className="space-y-1">
                    <Label htmlFor="org">Page</Label>
                    <select
                      id="org"
                      value={selectedOrg}
                      onChange={(e) => setSelectedOrg(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                    >
                      {organizations.map((org) => (
                        <option key={org.urn} value={org.urn}>
                          {org.name} ({org.role.toLowerCase().replace(/_/g, " ")})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="text">Post</Label>
                    <Textarea
                      id="text"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="What do you want to share?"
                      className="min-h-[150px]"
                      maxLength={3000}
                    />
                    <p className="text-xs text-muted-foreground">{text.length}/3000</p>
                  </div>
                  {postMutation.isError && (
                    <p className="text-sm text-destructive">{(postMutation.error as Error).message}</p>
                  )}
                  {postResult !== null && (
                    <p className="text-sm text-green-600">
                      Posted.{" "}
                      {postResult && (
                        <a
                          className="underline"
                          href={`https://www.linkedin.com/feed/update/${postResult}/`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View on LinkedIn
                        </a>
                      )}
                    </p>
                  )}
                  <Button onClick={handlePost} disabled={!text.trim() || postMutation.isPending}>
                    {postMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    Publish
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
