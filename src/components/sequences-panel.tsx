"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Zap,
  Plus,
  Play,
  Pause,
  Trash2,
  Loader2,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  FileText,
  Mail,
  UserPlus,
  MoreVertical,
  ChevronRight,
  AlertCircle,
  Upload,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import { CSVImportDialog } from "@/components/csv-import-dialog"

interface Profile {
  id: string
  firstName: string
  lastName: string
  headline?: string
  profilePicture?: string
  publicIdentifier?: string
  location?: string
}

interface Template {
  id: string
  name: string
  content: string
}

interface SequenceStep {
  id?: string
  order: number
  type: "invite" | "message" | "wait"
  templateId?: string
  template?: Template
  customMessage?: string
  delayDays: number
  delayHours: number
  delayMinutes: number
  condition?: string
}

interface Sequence {
  id: string
  name: string
  description?: string
  status: "draft" | "active" | "paused" | "completed"
  targetProfiles: Profile[]
  steps: SequenceStep[]
  dailyLimit: number
  delayMinMinutes: number
  delayMaxMinutes: number
  totalTargets: number
  sentCount: number
  acceptedCount: number
  failedCount: number
  createdAt: string
  updatedAt: string
}

export function SequencesPanel() {
  const queryClient = useQueryClient()

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showSearchDialog, setShowSearchDialog] = useState(false)
  const [showCSVImportDialog, setShowCSVImportDialog] = useState(false)
  const [selectedSequence, setSelectedSequence] = useState<Sequence | null>(null)
  const [deleteSequenceId, setDeleteSequenceId] = useState<string | null>(null)

  // Form state
  const [formName, setFormName] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formTargets, setFormTargets] = useState<Profile[]>([])
  const [formSteps, setFormSteps] = useState<SequenceStep[]>([
    { order: 1, type: "invite", delayDays: 0, delayHours: 0, delayMinutes: 0 }
  ])
  const [formDailyLimit, setFormDailyLimit] = useState(30)
  const [formDelayMin, setFormDelayMin] = useState(5)
  const [formDelayMax, setFormDelayMax] = useState(15)

  // Search state
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Profile[]>([])

  // Action states
  const [executingId, setExecutingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { data: sequences = [], isLoading } = useQuery({
    queryKey: ["sequences"],
    queryFn: async () => {
      const res = await fetch("/api/sequences")
      if (!res.ok) throw new Error("Failed to fetch sequences")
      const data = await res.json()
      return (data.sequences || []) as Sequence[]
    },
  })

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
      if (!res.ok) throw new Error("Search failed")
      const data = await res.json()
      return (data.profiles || []) as Profile[]
    },
    onSuccess: (data) => {
      setSearchResults(data)
    },
  })

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch("/api/sequences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to create sequence")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sequences"] })
      setShowCreateDialog(false)
      resetForm()
    },
    onError: (error: Error) => {
      setError(error.message)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Record<string, unknown> }) => {
      const res = await fetch(`/api/sequences/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to update sequence")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sequences"] })
      setShowCreateDialog(false)
      resetForm()
    },
    onError: (error: Error) => {
      setError(error.message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/sequences/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to delete sequence")
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sequences"] })
    },
    onError: (error: Error) => {
      setError(error.message)
    },
    onSettled: () => {
      setDeleteSequenceId(null)
    },
  })

  const startMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/sequences/${id}/start`, { method: "POST" })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to start sequence")
      }
      return res.json()
    },
    onMutate: (id) => { setExecutingId(id) },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sequences"] })
    },
    onError: (error: Error) => {
      setError(error.message)
    },
    onSettled: () => { setExecutingId(null) },
  })

  const pauseMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/sequences/${id}/pause`, { method: "POST" })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to pause sequence")
      }
      return res.json()
    },
    onMutate: (id) => { setExecutingId(id) },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sequences"] })
    },
    onError: (error: Error) => {
      setError(error.message)
    },
    onSettled: () => { setExecutingId(null) },
  })

  const executeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/sequences/${id}/execute`, { method: "POST" })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to execute sequence")
      }
      return res.json()
    },
    onMutate: (id) => { setExecutingId(id) },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sequences"] })
    },
    onError: (error: Error) => {
      setError(error.message)
    },
    onSettled: () => { setExecutingId(null) },
  })

  const handleSearch = () => {
    if (!searchQuery.trim() || searchQuery.length < 2) return
    searchMutation.mutate(searchQuery.trim())
  }

  const handleAddTarget = (profile: Profile) => {
    if (!formTargets.find(t => t.id === profile.id)) {
      setFormTargets([...formTargets, profile])
    }
  }

  const handleRemoveTarget = (profileId: string) => {
    setFormTargets(formTargets.filter(t => t.id !== profileId))
  }

  const handleAddStep = () => {
    setFormSteps([
      ...formSteps,
      {
        order: formSteps.length + 1,
        type: "wait",
        delayDays: 1,
        delayHours: 0,
        delayMinutes: 0
      }
    ])
  }

  const handleRemoveStep = (index: number) => {
    if (formSteps.length <= 1) return
    const newSteps = formSteps.filter((_, i) => i !== index)
    setFormSteps(newSteps.map((s, i) => ({ ...s, order: i + 1 })))
  }

  const handleUpdateStep = (index: number, updates: Partial<SequenceStep>) => {
    const newSteps = [...formSteps]
    newSteps[index] = { ...newSteps[index], ...updates }
    setFormSteps(newSteps)
  }

  const resetForm = () => {
    setFormName("")
    setFormDescription("")
    setFormTargets([])
    setFormSteps([{ order: 1, type: "invite", delayDays: 0, delayHours: 0, delayMinutes: 0 }])
    setFormDailyLimit(30)
    setFormDelayMin(5)
    setFormDelayMax(15)
    setSelectedSequence(null)
  }

  const getFormPayload = () => ({
    name: formName,
    description: formDescription,
    targetProfiles: formTargets,
    steps: formSteps,
    dailyLimit: formDailyLimit,
    delayMinMinutes: formDelayMin,
    delayMaxMinutes: formDelayMax,
  })

  const handleCreateSequence = () => {
    if (!formName.trim()) return
    setError(null)
    createMutation.mutate(getFormPayload())
  }

  const handleUpdateSequence = () => {
    if (!selectedSequence || !formName.trim()) return
    setError(null)
    updateMutation.mutate({ id: selectedSequence.id, payload: getFormPayload() })
  }

  const openEditDialog = (sequence: Sequence) => {
    setSelectedSequence(sequence)
    setFormName(sequence.name)
    setFormDescription(sequence.description || "")
    setFormTargets(sequence.targetProfiles)
    setFormSteps(sequence.steps.length > 0 ? sequence.steps : [
      { order: 1, type: "invite", delayDays: 0, delayHours: 0, delayMinutes: 0 }
    ])
    setFormDailyLimit(sequence.dailyLimit)
    setFormDelayMin(sequence.delayMinMinutes)
    setFormDelayMax(sequence.delayMaxMinutes)
    setShowCreateDialog(true)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Active</Badge>
      case "paused":
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Paused</Badge>
      case "completed":
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Completed</Badge>
      default:
        return <Badge variant="secondary">Draft</Badge>
    }
  }

  const saving = createMutation.isPending || updateMutation.isPending

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Outreach Sequences</h2>
          <p className="text-muted-foreground mt-1">
            Automate your LinkedIn outreach with scheduled connection requests
          </p>
        </div>
        <Button onClick={() => { resetForm(); setShowCreateDialog(true) }}>
          <Plus className="w-4 h-4 mr-2" />
          New Sequence
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {sequences.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Zap className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            No sequences yet. Create one to start automating your outreach!
          </p>
          <Button className="mt-4" onClick={() => { resetForm(); setShowCreateDialog(true) }}>
            <Plus className="w-4 h-4 mr-2" />
            Create Sequence
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {sequences.map((sequence) => (
            <div
              key={sequence.id}
              className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-lg">{sequence.name}</h3>
                    {getStatusBadge(sequence.status)}
                  </div>
                  {sequence.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {sequence.description}
                    </p>
                  )}

                  <div className="flex items-center gap-6 mt-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{sequence.totalTargets} targets</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>{sequence.sentCount} sent</span>
                    </div>
                    {sequence.failedCount > 0 && (
                      <div className="flex items-center gap-1">
                        <XCircle className="w-4 h-4 text-red-500" />
                        <span>{sequence.failedCount} failed</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{sequence.steps.length} steps</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {sequence.status === "draft" || sequence.status === "paused" ? (
                    <Button
                      size="sm"
                      onClick={() => startMutation.mutate(sequence.id)}
                      disabled={executingId === sequence.id || sequence.totalTargets === 0}
                    >
                      {executingId === sequence.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-1" />
                          Start
                        </>
                      )}
                    </Button>
                  ) : sequence.status === "active" ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => executeMutation.mutate(sequence.id)}
                        disabled={executingId === sequence.id}
                      >
                        {executingId === sequence.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Zap className="w-4 h-4 mr-1" />
                            Run Now
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => pauseMutation.mutate(sequence.id)}
                        disabled={executingId === sequence.id}
                      >
                        <Pause className="w-4 h-4 mr-1" />
                        Pause
                      </Button>
                    </>
                  ) : null}

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEditDialog(sequence)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteSequenceId(sequence.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => {
        setShowCreateDialog(open)
        if (!open) resetForm()
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedSequence ? "Edit Sequence" : "Create New Sequence"}
            </DialogTitle>
            <DialogDescription>
              Set up your outreach sequence with targets and steps
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Sequence Name</label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Tech Recruiters Outreach"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description (optional)</label>
                <Textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Describe the purpose of this sequence..."
                  className="mt-1"
                  rows={2}
                />
              </div>
            </div>

            {/* Target Profiles */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Target Profiles ({formTargets.length})
                </label>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowCSVImportDialog(true)}
                  >
                    <Upload className="w-4 h-4 mr-1" />
                    Import CSV
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowSearchDialog(true)}
                  >
                    <Search className="w-4 h-4 mr-1" />
                    Search & Add
                  </Button>
                </div>
              </div>

              {formTargets.length > 0 ? (
                <ScrollArea className="h-40 rounded-md border p-2">
                  <div className="space-y-2">
                    {formTargets.map((profile) => (
                      <div
                        key={profile.id}
                        className="flex items-center justify-between p-2 rounded bg-muted/50"
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={profile.profilePicture} />
                            <AvatarFallback>
                              {profile.firstName?.charAt(0)}{profile.lastName?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">
                              {profile.firstName} {profile.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {profile.headline}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveTarget(profile.id)}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="h-20 rounded-md border border-dashed flex items-center justify-center text-sm text-muted-foreground">
                  No targets added yet. Search and add profiles to target.
                </div>
              )}
            </div>

            {/* Sequence Steps */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Sequence Steps
                </label>
                <Button size="sm" variant="outline" onClick={handleAddStep}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Step
                </Button>
              </div>

              <div className="space-y-3">
                {formSteps.map((step, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-lg border bg-muted/30 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Step {index + 1}</span>
                      {formSteps.length > 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveStep(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground">Action Type</label>
                        <Select
                          value={step.type}
                          onValueChange={(value) => handleUpdateStep(index, { type: value as SequenceStep["type"] })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="invite">
                              <div className="flex items-center gap-2">
                                <UserPlus className="w-4 h-4" />
                                Send Invitation
                              </div>
                            </SelectItem>
                            <SelectItem value="message">
                              <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4" />
                                Send Message
                              </div>
                            </SelectItem>
                            <SelectItem value="wait">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                Wait
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {step.type !== "wait" && (
                        <div>
                          <label className="text-xs text-muted-foreground">Template</label>
                          <Select
                            value={step.templateId || "none"}
                            onValueChange={(value) => handleUpdateStep(index, {
                              templateId: value === "none" ? undefined : value
                            })}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select template" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No template</SelectItem>
                              {templates.map((template) => (
                                <SelectItem key={template.id} value={template.id}>
                                  {template.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>

                    {step.type === "wait" && (
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground">Days</label>
                          <Input
                            type="number"
                            min={0}
                            max={365}
                            value={step.delayDays}
                            onChange={(e) => handleUpdateStep(index, { delayDays: Math.max(0, Math.min(365, parseInt(e.target.value) || 0)) })}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Hours</label>
                          <Input
                            type="number"
                            min={0}
                            max={23}
                            value={step.delayHours}
                            onChange={(e) => handleUpdateStep(index, { delayHours: Math.max(0, Math.min(23, parseInt(e.target.value) || 0)) })}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Minutes</label>
                          <Input
                            type="number"
                            min={0}
                            max={59}
                            value={step.delayMinutes}
                            onChange={(e) => handleUpdateStep(index, { delayMinutes: Math.max(0, Math.min(59, parseInt(e.target.value) || 0)) })}
                            className="mt-1"
                          />
                        </div>
                      </div>
                    )}

                    {step.type !== "wait" && !step.templateId && (
                      <div>
                        <label className="text-xs text-muted-foreground">Custom Message</label>
                        <Textarea
                          value={step.customMessage || ""}
                          onChange={(e) => handleUpdateStep(index, { customMessage: e.target.value })}
                          placeholder="Enter your message... Use {{firstName}}, {{lastName}}, etc."
                          className="mt-1"
                          rows={2}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Settings */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Scheduling Settings</label>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground">Daily Limit</label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={formDailyLimit}
                    onChange={(e) => setFormDailyLimit(Math.max(1, Math.min(100, parseInt(e.target.value) || 30)))}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Max invites per day</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Min Delay (min)</label>
                  <Input
                    type="number"
                    min={1}
                    max={60}
                    value={formDelayMin}
                    onChange={(e) => setFormDelayMin(Math.max(1, Math.min(60, parseInt(e.target.value) || 5)))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Max Delay (min)</label>
                  <Input
                    type="number"
                    min={1}
                    max={120}
                    value={formDelayMax}
                    onChange={(e) => setFormDelayMax(Math.max(1, Math.min(120, parseInt(e.target.value) || 15)))}
                    className="mt-1"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                LinkedIn limits: ~100 invites/day, 200/week. We recommend 30-50/day.
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={selectedSequence ? handleUpdateSequence : handleCreateSequence}
                disabled={saving || !formName.trim()}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                {selectedSequence ? "Update Sequence" : "Create Sequence"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Search Dialog */}
      <Dialog open={showSearchDialog} onOpenChange={setShowSearchDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Search Profiles</DialogTitle>
            <DialogDescription>
              Search for LinkedIn profiles to add to your sequence
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="flex gap-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, title, company..."
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={searchMutation.isPending}>
                {searchMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </Button>
            </div>

            <ScrollArea className="h-64">
              {searchResults.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.map((profile) => {
                    const isAdded = formTargets.some(t => t.id === profile.id)
                    return (
                      <div
                        key={profile.id}
                        className="flex items-center justify-between p-2 rounded hover:bg-muted"
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={profile.profilePicture} />
                            <AvatarFallback>
                              {profile.firstName?.charAt(0)}{profile.lastName?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {profile.firstName} {profile.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground truncate max-w-[250px]">
                              {profile.headline}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant={isAdded ? "secondary" : "default"}
                          onClick={() => handleAddTarget(profile)}
                          disabled={isAdded}
                        >
                          {isAdded ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <Plus className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Search className="w-8 h-8 mb-2" />
                  <p>Search for profiles to add</p>
                </div>
              )}
            </ScrollArea>

            <div className="flex justify-between items-center pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                {formTargets.length} profiles selected
              </p>
              <Button onClick={() => setShowSearchDialog(false)}>
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteSequenceId} onOpenChange={() => setDeleteSequenceId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sequence?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this sequence and all its execution history.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteSequenceId && deleteMutation.mutate(deleteSequenceId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* CSV Import Dialog */}
      <CSVImportDialog
        open={showCSVImportDialog}
        onOpenChange={setShowCSVImportDialog}
        sequences={sequences.map(s => ({
          id: s.id,
          name: s.name,
          status: s.status,
          totalTargets: s.totalTargets
        }))}
        onImportComplete={(profiles, sequenceId) => {
          // Add imported profiles to form targets (avoiding duplicates)
          const existingIds = new Set(formTargets.map(t => t.id))
          const newProfiles = profiles.filter(p => !existingIds.has(p.id))
          setFormTargets([...formTargets, ...newProfiles])
          setShowCSVImportDialog(false)
        }}
      />
    </div>
  )
}
