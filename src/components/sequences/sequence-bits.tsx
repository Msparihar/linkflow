"use client"

import { AlertCircle, Clock, Moon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
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
import { cn } from "@/lib/utils"
import {
  estimateFirstStep,
  hoursLabel,
  isSendingNow,
  rate,
  STAGE_LABEL,
  STATUS_LABEL,
  type Sequence,
  type Stage,
} from "./shared"

const STATUS_STYLE: Record<Sequence["status"], string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-[var(--success)]/10 text-[var(--success)]",
  paused: "bg-[var(--chart-5)]/15 text-[var(--chart-5)]",
  completed: "bg-accent text-accent-foreground",
}

export function StatusBadge({ status }: { status: Sequence["status"] }) {
  return (
    <Badge className={cn("border-transparent gap-1.5", STATUS_STYLE[status])}>
      <span className={cn("size-1.5 rounded-full bg-current", status === "active" && "animate-pulse")} />
      {STATUS_LABEL[status]}
    </Badge>
  )
}

const STAGE_STYLE: Record<Stage, string> = {
  queued: "bg-muted text-muted-foreground",
  invited: "bg-accent text-accent-foreground",
  accepted: "bg-[var(--success)]/10 text-[var(--success)]",
  messaged: "bg-[var(--chart-4)]/15 text-[var(--chart-4)]",
  replied: "bg-[var(--success)] text-[var(--success-foreground)]",
  failed: "bg-destructive/10 text-destructive",
  not_accepted: "bg-muted text-muted-foreground",
  done: "bg-muted text-muted-foreground",
}

export function StageBadge({ stage }: { stage: Stage }) {
  return <Badge className={cn("border-transparent", STAGE_STYLE[stage])}>{STAGE_LABEL[stage]}</Badge>
}

interface FunnelStage {
  label: string
  value: number
  share?: string
  color: string
}

function funnelStages(sequence: Sequence): FunnelStage[] {
  const stats = sequence.stats
  const people = sequence.totalTargets
  const startsWithInvite = sequence.steps.some((step) => step.type === "invite")
  const reached = startsWithInvite ? stats?.invited ?? 0 : stats?.messaged ?? 0

  const stages: FunnelStage[] = [{ label: "People", value: people, color: "var(--muted-foreground)" }]
  if (startsWithInvite) {
    stages.push({ label: "Invited", value: stats?.invited ?? 0, share: `${rate(reached, people)} of people`, color: "var(--chart-1)" })
    stages.push({ label: "Accepted", value: stats?.accepted ?? 0, share: `${rate(stats?.accepted ?? 0, reached)} of invited`, color: "var(--chart-2)" })
  } else {
    stages.push({ label: "Messaged", value: reached, share: `${rate(reached, people)} of people`, color: "var(--chart-1)" })
  }
  stages.push({
    label: "Replied",
    value: stats?.replied ?? 0,
    share: `${rate(stats?.replied ?? 0, reached)} of ${startsWithInvite ? "invited" : "messaged"}`,
    color: "var(--chart-4)",
  })
  return stages
}

export function SequenceFunnel({ sequence, large = false }: { sequence: Sequence; large?: boolean }) {
  const stages = funnelStages(sequence)
  const top = Math.max(1, stages[0].value)

  return (
    <dl className={cn("grid gap-3", stages.length === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3")}>
      {stages.map((stage) => (
        <div key={stage.label} className="min-w-0">
          <dt className="text-xs text-muted-foreground">{stage.label}</dt>
          <dd className="mt-0.5 flex items-baseline gap-2">
            <span className={cn("font-semibold tabular-nums", large ? "text-3xl" : "text-xl")}>
              {stage.value.toLocaleString()}
            </span>
            {stage.share && sequence.status !== "draft" && (
              <span className="text-xs text-muted-foreground truncate">{stage.share}</span>
            )}
          </dd>
          <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{ width: `${Math.min(100, (stage.value / top) * 100)}%`, background: stage.color }}
            />
          </div>
        </div>
      ))}
    </dl>
  )
}

export function SequenceStatusLine({ sequence }: { sequence: Sequence }) {
  const stats = sequence.stats

  if (stats?.notice && sequence.status !== "completed" && sequence.status !== "draft") {
    return (
      <p className="flex items-start gap-1.5 text-sm text-[var(--chart-3)]">
        <AlertCircle className="size-4 mt-0.5 shrink-0" />
        <span>{stats.notice}</span>
      </p>
    )
  }

  if (sequence.status === "active") {
    const sleeping = !isSendingNow(sequence)
    return (
      <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
        {sleeping ? <Moon className="size-4 mt-0.5 shrink-0" /> : <Clock className="size-4 mt-0.5 shrink-0" />}
        <span>
          {sleeping ? `Outside sending hours. Sends ${hoursLabel(sequence)}.` : "Sending by itself."}{" "}
          {stats?.sentToday ?? 0} of {sequence.dailyLimit} sent in the last 24 hours
          {(stats?.inProgress ?? 0) > 0 ? `, ${stats?.inProgress} people in progress.` : "."}
        </span>
      </p>
    )
  }

  if (sequence.status === "paused") {
    return (
      <p className="text-sm text-muted-foreground">
        Paused with {stats?.inProgress ?? 0} people part-way through. Nothing goes out until you resume.
      </p>
    )
  }

  if (sequence.status === "draft") {
    return (
      <p className="text-sm text-muted-foreground">
        {sequence.totalTargets === 0
          ? "Add people to this draft, then start it."
          : `Ready to start: up to ${sequence.dailyLimit} a day, ${hoursLabel(sequence)}.`}
      </p>
    )
  }

  return <p className="text-sm text-muted-foreground">Everyone has been through every step.</p>
}

interface StartConfirmProps {
  sequence: Sequence | null
  onConfirm: (sequence: Sequence) => void
  onCancel: () => void
}

export function StartConfirm({ sequence, onConfirm, onCancel }: StartConfirmProps) {
  if (!sequence) return null

  const resuming = sequence.status === "paused"
  const actions = sequence.steps.filter((step) => step.type !== "wait")
  const first = actions[0]
  const followUps = actions.length - 1
  const people = sequence.totalTargets
  const estimate = estimateFirstStep(people, sequence.dailyLimit, sequence.sendWeekdaysOnly)
  const finish = estimate.date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })

  const points = resuming
    ? [
        `Picks up where it left off for ${sequence.stats?.inProgress ?? 0} people.`,
        `Up to ${sequence.dailyLimit} a day, ${hoursLabel(sequence)}.`,
      ]
    : [
        first?.type === "invite"
          ? `Sends a real LinkedIn invitation to ${people} ${people === 1 ? "person" : "people"}.`
          : `Sends a real LinkedIn message to ${people} ${people === 1 ? "person" : "people"}.`,
        `Up to ${sequence.dailyLimit} a day, ${hoursLabel(sequence)}.`,
        estimate.days === 1
          ? "At that pace the first step is done within a day."
          : `At that pace the first step is done in about ${estimate.days} days, around ${finish}.`,
        ...(followUps > 0
          ? [`${followUps} follow-up ${followUps === 1 ? "message goes" : "messages go"} only to people who accept and haven't replied.`]
          : []),
      ]

  return (
    <AlertDialog open onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {resuming ? "Resume" : "Start"} &ldquo;{sequence.name}&rdquo;?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <ul className="space-y-1.5 text-sm text-foreground">
                {points.map((point) => (
                  <li key={point} className="flex gap-2">
                    <span className="mt-2 size-1 rounded-full bg-muted-foreground shrink-0" />
                    {point}
                  </li>
                ))}
              </ul>
              <p className="text-sm text-muted-foreground">You can pause it at any time.</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Not yet</AlertDialogCancel>
          <AlertDialogAction onClick={() => onConfirm(sequence)}>
            {resuming ? "Resume" : "Start sending"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
