"use client"

import { useState } from "react"
import Link from "next/link"
import {
  BarChart3,
  Copy,
  Loader2,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Plus,
  Send,
  Trash2,
  Zap,
} from "lucide-react"
import { ErrorState } from "@/components/error-state"
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
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { SequenceFunnel, SequenceStatusLine, StartConfirm, StatusBadge } from "@/components/sequences/sequence-bits"
import { SequenceEditor } from "@/components/sequences/sequence-editor"
import type { Sequence } from "@/components/sequences/shared"
import { useSequenceActions, useSequences, useTemplates } from "@/components/sequences/use-sequences"

type Editing = { sequence: Sequence | null } | null

export function SequencesPanel() {
  const { data: sequences = [], isLoading, isError, error, refetch, isFetching } = useSequences()
  const { data: templates = [] } = useTemplates()
  const actions = useSequenceActions()

  const [editing, setEditing] = useState<Editing>(null)
  const [starting, setStarting] = useState<Sequence | null>(null)
  const [deleting, setDeleting] = useState<Sequence | null>(null)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Outreach Sequences</h2>
          <p className="text-muted-foreground mt-1">
            Invitations and follow-ups that go out by themselves and stop when someone replies
          </p>
        </div>
        <Button onClick={() => setEditing({ sequence: null })}>
          <Plus className="size-4" />
          New sequence
        </Button>
      </div>

      {isError ? (
        <ErrorState
          title="Couldn't load your sequences"
          error={error}
          onRetry={() => refetch()}
          retrying={isFetching}
        />
      ) : sequences.length === 0 ? (
        <Empty className="border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Zap />
            </EmptyMedia>
            <EmptyTitle>No sequences yet</EmptyTitle>
            <EmptyDescription>
              Pick people, write an invitation and a follow-up, and let it run. You see who accepted and who replied.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => setEditing({ sequence: null })}>
              <Plus className="size-4" />
              Create your first sequence
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {sequences.map((sequence) => (
            <SequenceCard
              key={sequence.id}
              sequence={sequence}
              busy={
                (actions.start.isPending && actions.start.variables?.id === sequence.id) ||
                (actions.pause.isPending && actions.pause.variables?.id === sequence.id) ||
                (actions.sendNow.isPending && actions.sendNow.variables?.id === sequence.id)
              }
              onStart={() => setStarting(sequence)}
              onPause={() => actions.pause.mutate(sequence)}
              onSendNow={() => actions.sendNow.mutate(sequence)}
              onEdit={() => setEditing({ sequence })}
              onDuplicate={() => actions.duplicate.mutate(sequence)}
              onDelete={() => setDeleting(sequence)}
            />
          ))}
        </div>
      )}

      {editing && (
        <SequenceEditor
          key={editing.sequence?.id ?? "new"}
          sequence={editing.sequence}
          templates={templates}
          onClose={() => setEditing(null)}
        />
      )}

      <StartConfirm
        sequence={starting}
        onCancel={() => setStarting(null)}
        onConfirm={(sequence) => {
          actions.start.mutate(sequence)
          setStarting(null)
        }}
      />

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{deleting?.name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              The sequence and its results are removed for good. Messages already sent stay in your LinkedIn inbox.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleting) actions.remove.mutate(deleting)
                setDeleting(null)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

interface SequenceCardProps {
  sequence: Sequence
  busy: boolean
  onStart: () => void
  onPause: () => void
  onSendNow: () => void
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
}

function SequenceCard({ sequence, busy, onStart, onPause, onSendNow, onEdit, onDuplicate, onDelete }: SequenceCardProps) {
  const hasNewPeople = sequence.totalTargets > (sequence.executionCount ?? 0)
  const canStart =
    sequence.totalTargets > 0 &&
    sequence.steps.length > 0 &&
    (sequence.status === "draft" || sequence.status === "paused" || (sequence.status === "completed" && hasNewPeople))
  const steps = sequence.steps.filter((step) => step.type !== "wait").length

  return (
    <Card className="min-w-0 transition-shadow hover:shadow-md">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-lg truncate">{sequence.name}</h3>
              <StatusBadge status={sequence.status} />
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {steps} {steps === 1 ? "step" : "steps"}
              {sequence.description ? ` · ${sequence.description}` : ""}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="shrink-0 -mr-2 -mt-1" aria-label="More actions">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={onEdit}>
                <Pencil />
                Edit
              </DropdownMenuItem>
              {sequence.status === "active" && (
                <DropdownMenuItem onSelect={onSendNow}>
                  <Send />
                  Send the next few now
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={onDuplicate}>
                <Copy />
                Duplicate without people
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                <Trash2 />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <SequenceFunnel sequence={sequence} />
        <SequenceStatusLine sequence={sequence} />

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {sequence.status === "active" ? (
            <Button size="sm" variant="outline" onClick={onPause} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Pause className="size-4" />}
              Pause
            </Button>
          ) : sequence.status === "completed" && !hasNewPeople ? null : (
            <Button
              size="sm"
              onClick={onStart}
              disabled={busy || !canStart}
              title={canStart ? undefined : "Add people and at least one step first"}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
              {sequence.status === "paused" ? "Resume" : sequence.status === "completed" ? "Send to new people" : "Start"}
            </Button>
          )}
          {sequence.status === "draft" ? (
            <Button size="sm" variant="outline" onClick={onEdit}>
              <Pencil className="size-4" />
              Edit
            </Button>
          ) : (
            <Button size="sm" variant="outline" asChild>
              <Link href={`/dashboard/sequences/${sequence.id}`}>
                <BarChart3 className="size-4" />
                Results
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
