import { hasSendingHours, withinSendingHours } from "@/lib/sequence-text"

export interface Profile {
  id: string
  firstName: string
  lastName: string
  headline?: string
  profilePicture?: string
  publicIdentifier?: string
  location?: string
  connectionDegree?: number
}

export interface Template {
  id: string
  name: string
  content: string
}

export interface ApiStep {
  id?: string
  type: "invite" | "message" | "wait"
  templateId?: string | null
  customMessage?: string | null
  delayDays: number
  delayHours: number
  delayMinutes: number
}

export interface SequenceStats {
  invited: number
  accepted: number
  messaged: number
  replied: number
  failed: number
  inProgress: number
  sentToday: number
  notice: string | null
}

export interface Sequence {
  id: string
  name: string
  description?: string | null
  status: "draft" | "active" | "paused" | "completed"
  targetProfiles: Profile[]
  steps: ApiStep[]
  dailyLimit: number
  delayMinMinutes: number
  delayMaxMinutes: number
  sendFromHour: number
  sendUntilHour: number
  sendWeekdaysOnly: boolean
  timezone: string
  totalTargets: number
  executionCount?: number
  stats?: SequenceStats
  createdAt: string
  updatedAt: string
}

export type Stage =
  | "queued"
  | "invited"
  | "accepted"
  | "messaged"
  | "replied"
  | "failed"
  | "not_accepted"
  | "done"

export interface SequencePerson {
  id: string
  profileId: string
  name: string
  headline: string
  profilePicture: string
  publicIdentifier: string
  status: string
  stage: Stage
  next: string | null
  nextActionAt: string | null
  error: string | null
  chatId: string | null
  lastActivityAt: string | null
}

export interface SequenceDetail extends Sequence {
  people: SequencePerson[]
}

export const STAGE_LABEL: Record<Stage, string> = {
  queued: "Not started",
  invited: "Invited",
  accepted: "Accepted",
  messaged: "Messaged",
  replied: "Replied",
  failed: "Failed",
  not_accepted: "Didn't accept",
  done: "Done",
}

export const STATUS_LABEL: Record<Sequence["status"], string> = {
  draft: "Draft",
  active: "Running",
  paused: "Paused",
  completed: "Finished",
}

// One action in the editor's timeline; a wait step before it is folded into its delay.
export interface TimelineStep {
  key: string
  type: "invite" | "message"
  templateId?: string
  message: string
  delayDays: number
  delayHours: number
  delayMinutes: number
  hasWait: boolean
}

let stepKey = 0
export const newStepKey = () => `step-${++stepKey}`

export function toTimeline(steps: ApiStep[]): TimelineStep[] {
  const timeline: TimelineStep[] = []
  let wait: ApiStep | null = null

  for (const step of steps) {
    if (step.type === "wait") {
      wait = step
      continue
    }
    timeline.push({
      key: newStepKey(),
      type: step.type,
      templateId: step.templateId || undefined,
      message: step.customMessage || "",
      delayDays: wait?.delayDays || 0,
      delayHours: wait?.delayHours || 0,
      delayMinutes: wait?.delayMinutes || 0,
      hasWait: !!wait,
    })
    wait = null
  }
  return timeline
}

// `keepShape` leaves out waits the saved sequence never had, so a started sequence stays editable.
export function toApiSteps(timeline: TimelineStep[], keepShape: boolean) {
  const steps: Array<Omit<ApiStep, "id">> = []
  timeline.forEach((step, index) => {
    if (index > 0 && (step.hasWait || !keepShape)) {
      steps.push({
        type: "wait",
        delayDays: step.delayDays,
        delayHours: step.delayHours,
        delayMinutes: step.delayMinutes,
      })
    }
    steps.push({
      type: step.type,
      templateId: step.templateId || null,
      customMessage: step.templateId ? null : step.message,
      delayDays: 0,
      delayHours: 0,
      delayMinutes: 0,
    })
  })
  return steps
}

export function stepText(step: TimelineStep, templates: Template[]): string {
  return step.templateId
    ? templates.find((t) => t.id === step.templateId)?.content || ""
    : step.message
}

export function delayLabel(step: Pick<TimelineStep, "delayDays" | "delayHours" | "delayMinutes">): string {
  const parts: string[] = []
  if (step.delayDays) parts.push(`${step.delayDays} day${step.delayDays === 1 ? "" : "s"}`)
  if (step.delayHours) parts.push(`${step.delayHours} hour${step.delayHours === 1 ? "" : "s"}`)
  if (step.delayMinutes) parts.push(`${step.delayMinutes} min`)
  return parts.join(" ")
}

export function timingLabel(timeline: TimelineStep[], index: number): string {
  const step = timeline[index]
  if (index === 0) return "As soon as the sequence starts"
  const delay = delayLabel(step)
  const previous = timeline[index - 1]
  if (previous.type === "invite") {
    return delay ? `${delay} after they accept` : "As soon as they accept"
  }
  return delay ? `${delay} later, if they haven't replied` : "Right after, if they haven't replied"
}

export type PaceKey = "careful" | "normal" | "fast"

export const PACES: Record<PaceKey, { label: string; hint: string; dailyLimit: number; min: number; max: number }> = {
  careful: {
    label: "Careful",
    hint: "About 10 a day, well spaced. Safest for a new or small account.",
    dailyLimit: 10,
    min: 10,
    max: 25,
  },
  normal: {
    label: "Normal",
    hint: "About 20 a day. Right for most accounts.",
    dailyLimit: 20,
    min: 5,
    max: 15,
  },
  fast: {
    label: "Fast",
    hint: "About 40 a day. Only for an established, active account.",
    dailyLimit: 40,
    min: 2,
    max: 8,
  },
}

export function paceOf(pace: { dailyLimit: number; delayMinMinutes: number; delayMaxMinutes: number }): PaceKey | "custom" {
  const match = (Object.keys(PACES) as PaceKey[]).find(
    (key) =>
      PACES[key].dailyLimit === pace.dailyLimit &&
      PACES[key].min === pace.delayMinMinutes &&
      PACES[key].max === pace.delayMaxMinutes
  )
  return match || "custom"
}

export function hourLabel(hour: number): string {
  if (hour === 0 || hour === 24) return "midnight"
  if (hour === 12) return "noon"
  return hour < 12 ? `${hour}am` : `${hour - 12}pm`
}

type Hours = Pick<Sequence, "sendFromHour" | "sendUntilHour" | "sendWeekdaysOnly" | "timezone">

export function hoursLabel(hours: Hours): string {
  if (!hasSendingHours(hours)) return "at any hour"
  const days = hours.sendWeekdaysOnly ? "on weekdays" : "every day"
  if (hours.sendFromHour === 0 && hours.sendUntilHour === 24) return days
  return `${days}, ${hourLabel(hours.sendFromHour)} to ${hourLabel(hours.sendUntilHour)}`
}

export function isSendingNow(hours: Hours): boolean {
  return withinSendingHours(hours)
}

// Rough finish date for the first step, at the daily limit and skipping weekends if set.
export function estimateFirstStep(people: number, dailyLimit: number, weekdaysOnly: boolean) {
  const days = Math.max(1, Math.ceil(people / Math.max(1, dailyLimit)))
  const date = new Date()
  let counted = 0
  while (true) {
    const weekend = date.getDay() === 0 || date.getDay() === 6
    if (!weekdaysOnly || !weekend) counted++
    if (counted >= days) break
    date.setDate(date.getDate() + 1)
  }
  return { days, date }
}

export function rate(part: number, whole: number): string {
  if (!whole) return "0%"
  return `${Math.round((part / whole) * 100)}%`
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("")
}

export function proxied(url?: string): string | undefined {
  return url ? `/api/proxy-image?url=${encodeURIComponent(url)}` : undefined
}
