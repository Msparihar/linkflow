"use client"

import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Search,
  Loader2,
  UserPlus,
  CheckCircle,
  AlertCircle,
  MapPin,
  FileText,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

interface Profile {
  id: string
  firstName: string
  lastName: string
  headline: string
  profilePicture: string
  publicIdentifier: string
  connectionDegree?: number
  location: string
}

interface Template {
  id: string
  name: string
  content: string
}

const DEFAULT_INVITE_TEMPLATE = `Hi {{firstName}}, I came across your profile and would love to connect. Looking forward to being part of your network!`

export function SearchPanel() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("default")

  // Invite dialog state
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null)
  const [inviteMessage, setInviteMessage] = useState("")
  const [inviteStatus, setInviteStatus] = useState<"idle" | "success" | "error">("idle")
  const [inviteError, setInviteError] = useState("")
  const [sentInvites, setSentInvites] = useState<Set<string>>(new Set())

  const { data: templates = [] } = useQuery({
    queryKey: ["templates"],
    queryFn: async () => {
      const res = await fetch("/api/templates")
      if (!res.ok) throw new Error("Failed to fetch templates")
      const data = await res.json()
      return (data.templates || []) as Template[]
    },
  })

  const searchMutation = useMutation({
    mutationFn: async (query: string) => {
      const res = await fetch(`/api/linkedin/search?q=${encodeURIComponent(query)}&limit=20`)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Search failed")
      }
      const data = await res.json()
      return (data.profiles || []) as Profile[]
    },
  })

  const inviteMutation = useMutation({
    mutationFn: async ({ profileId, message }: { profileId: string; message?: string }) => {
      const res = await fetch("/api/linkedin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, message }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to send connection request")
      }
      return res.json()
    },
    onSuccess: () => {
      setInviteStatus("success")
      if (selectedProfile) {
        setSentInvites((prev) => new Set(prev).add(selectedProfile.id))
      }
      setTimeout(() => {
        handleCloseInviteDialog()
      }, 2000)
    },
    onError: (error: Error) => {
      setInviteStatus("error")
      setInviteError(error.message)
    },
  })

  // Helper to replace placeholders in template
  const applyTemplate = (template: string, profile: Profile) => {
    return template
      .replace(/\{\{firstName\}\}/g, profile.firstName)
      .replace(/\{\{lastName\}\}/g, profile.lastName)
      .replace(/\{\{fullName\}\}/g, `${profile.firstName} ${profile.lastName}`)
      .replace(/\{\{headline\}\}/g, profile.headline || "")
      .replace(/\{\{location\}\}/g, profile.location || "")
  }

  const handleSearch = () => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) return
    searchMutation.mutate(searchQuery.trim())
  }

  const handleOpenInviteDialog = (profile: Profile) => {
    setSelectedProfile(profile)
    // Pre-fill with selected template or default
    const templateContent = selectedTemplateId === "default"
      ? DEFAULT_INVITE_TEMPLATE
      : templates.find(t => t.id === selectedTemplateId)?.content || DEFAULT_INVITE_TEMPLATE
    setInviteMessage(applyTemplate(templateContent, profile))
    setInviteStatus("idle")
    setInviteError("")
  }

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId)
    if (selectedProfile) {
      const templateContent = templateId === "default"
        ? DEFAULT_INVITE_TEMPLATE
        : templates.find(t => t.id === templateId)?.content || DEFAULT_INVITE_TEMPLATE
      setInviteMessage(applyTemplate(templateContent, selectedProfile))
    }
  }

  const handleCloseInviteDialog = () => {
    setSelectedProfile(null)
    setInviteMessage("")
    setInviteStatus("idle")
    setInviteError("")
  }

  const handleSendInvite = () => {
    if (!selectedProfile) return
    setInviteStatus("idle")
    setInviteError("")
    inviteMutation.mutate({
      profileId: selectedProfile.id,
      message: inviteMessage.trim() || undefined,
    })
  }

  const getConnectionBadge = (degree?: number) => {
    if (!degree) return null
    if (degree === 1) return <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">1st</span>
    if (degree === 2) return <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">2nd</span>
    if (degree === 3) return <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">3rd+</span>
    return null
  }

  const profiles = searchMutation.data || []
  const hasSearched = searchMutation.isSuccess || searchMutation.isError

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Search LinkedIn</h2>
        <p className="text-muted-foreground mt-1">
          Find people and send connection requests
        </p>
      </div>

      {/* Search input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, title, or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-10"
          />
        </div>
        <Button onClick={handleSearch} disabled={searchMutation.isPending || searchQuery.trim().length < 2}>
          {searchMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
        </Button>
      </div>

      {/* Results */}
      {searchMutation.isPending ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : profiles.length > 0 ? (
        <div className="space-y-3">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className="flex items-center gap-3 p-4 rounded-lg border bg-card hover:shadow-md transition-shadow overflow-hidden"
            >
              <Avatar className="w-12 h-12 flex-shrink-0">
                <AvatarImage src={profile.profilePicture || "/placeholder.svg"} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {profile.firstName.charAt(0)}
                  {profile.lastName.charAt(0)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0 overflow-hidden">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold truncate">
                    {profile.firstName} {profile.lastName}
                  </h3>
                  <span className="flex-shrink-0">{getConnectionBadge(profile.connectionDegree)}</span>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {profile.headline}
                </p>
                {profile.location && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1 truncate">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{profile.location}</span>
                  </p>
                )}
              </div>

              <Button
                variant={sentInvites.has(profile.id) ? "outline" : "default"}
                size="sm"
                className="flex-shrink-0"
                onClick={() => handleOpenInviteDialog(profile)}
                disabled={sentInvites.has(profile.id) || profile.connectionDegree === 1}
              >
                {sentInvites.has(profile.id) ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Sent
                  </>
                ) : profile.connectionDegree === 1 ? (
                  "Connected"
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Connect
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>
      ) : hasSearched ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Search className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            No profiles found for &quot;{searchQuery}&quot;
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Try a different search term
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Search className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Search for LinkedIn profiles to connect with
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Enter a name, job title, or company to get started
          </p>
        </div>
      )}

      {/* Invite Dialog */}
      <Dialog open={!!selectedProfile} onOpenChange={() => handleCloseInviteDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedProfile && (
                <>
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={selectedProfile.profilePicture || "/placeholder.svg"} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {selectedProfile.firstName.charAt(0)}
                      {selectedProfile.lastName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <span className="text-foreground">
                      {selectedProfile.firstName} {selectedProfile.lastName}
                    </span>
                    <p className="text-sm font-normal text-muted-foreground truncate max-w-[250px]">
                      {selectedProfile.headline}
                    </p>
                  </div>
                </>
              )}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Send a connection request to {selectedProfile?.firstName} {selectedProfile?.lastName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {inviteStatus === "success" && (
              <Alert className="bg-green-50 border-green-200 text-green-800">
                <CheckCircle className="w-4 h-4" />
                <AlertDescription>Connection request sent!</AlertDescription>
              </Alert>
            )}

            {inviteStatus === "error" && (
              <Alert variant="destructive">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>{inviteError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Use Template
                </label>
                <Select
                  value={selectedTemplateId}
                  onValueChange={handleTemplateChange}
                  disabled={inviteMutation.isPending || inviteStatus === "success"}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default Template</SelectItem>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">
                  Connection Note
                </label>
                <Textarea
                  placeholder="Hi, I'd like to connect with you..."
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  className={cn(
                    "mt-2 resize-none",
                    inviteMessage.length > 300 && "border-destructive"
                  )}
                  rows={4}
                  disabled={inviteMutation.isPending || inviteStatus === "success"}
                />
                <div className="flex justify-between mt-1">
                  <p className="text-xs text-muted-foreground">
                    You can edit the message above
                  </p>
                  <p className={cn(
                    "text-xs",
                    inviteMessage.length > 300 ? "text-destructive" : "text-muted-foreground"
                  )}>
                    {inviteMessage.length} / 300 characters
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={handleCloseInviteDialog}
                disabled={inviteMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendInvite}
                disabled={inviteMutation.isPending || inviteMessage.length > 300 || inviteStatus === "success"}
              >
                {inviteMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Send Request
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
