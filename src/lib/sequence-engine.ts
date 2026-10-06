import type { Prisma, SequenceExecution } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getUnipileClient } from "@/lib/unipile"
import { applyTemplate, fitInviteNote, withinSendingHours } from "@/lib/sequence-text"

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

const TICK_MS = MINUTE
const MANUAL_BATCH = 5
const READY_BATCH = 50
const MAX_RETRIES = 3
const RETRY_AFTER_MS = HOUR
const ACCEPT_RECHECK_MS = HOUR
const ACCEPT_GIVE_UP_MS = 60 * DAY
const RESULT_WINDOW_MS = 60 * DAY
const SWEEP_EVERY_MS = 10 * MINUTE
const CLAIM_MS = 10 * MINUTE
const CONNECTIONS_TTL_MS = 30 * MINUTE
const INCOMING_TTL_MS = 10 * MINUTE

const OPEN_STATUSES = ["pending", "in_progress"]

type SequenceWithSteps = Prisma.OutreachSequenceGetPayload<{
  include: {
    steps: { include: { template: true } }
    user: { select: { unipileAccountId: true } }
  }
}>
type Step = SequenceWithSteps["steps"][number]

interface Profile {
  id: string
  firstName?: string
  lastName?: string
  headline?: string
  location?: string
}

export interface RunSummary {
  sent: number
  waiting: number
  heldForLimit: number
  failed: number
  retrying: number
  finished: number
  sentToday: number
  dailyLimit: number
  paused?: string
  inviteLimit?: boolean
}

export class SequenceRunError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

class UnipileFailure extends Error {
  status: number
  constructor(status: number, body: string) {
    super(body)
    this.status = status
  }
}

class RunStopped extends Error {}

const recentConnections = new Map<string, { ids: Set<string>; at: number }>()
const incoming = new Map<string, { latest: Map<string, number>; at: number }>()
const sendBlockedUntil = new Map<string, number>()
const nextSendAt = new Map<string, number>()
const lastSweepAt = new Map<string, number>()

function stepText(step: Step, profile: Profile): string {
  const raw = step.customMessage || step.template?.content || ""
  return applyTemplate(raw, profile).trim()
}

function stepDelayMs(step: Step): number {
  return step.delayDays * DAY + step.delayHours * HOUR + step.delayMinutes * MINUTE
}

function unipile() {
  const baseUrl = process.env.UNIPILE_API_URL
  const token = process.env.UNIPILE_ACCESS_TOKEN
  if (!baseUrl || !token) throw new SequenceRunError("Unipile not configured", 500)
  return { baseUrl, headers: { "X-API-KEY": token, Accept: "application/json" } }
}

async function sendInvite(accountId: string, providerId: string, note: string) {
  const { baseUrl, headers } = unipile()
  const body: Record<string, string> = { provider_id: providerId, account_id: accountId }
  if (note) body.message = fitInviteNote(note)

  const res = await fetch(`${baseUrl}/api/v1/users/invite`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) throw new UnipileFailure(res.status, await res.text())
}

async function sendMessage(accountId: string, providerId: string, text: string): Promise<string | null> {
  try {
    const response = await getUnipileClient().messaging.startNewChat({
      account_id: accountId,
      attendees_ids: [providerId],
      text,
      options: { linkedin: { api: "classic", inmail: false } },
    })
    return response.chat_id ?? null
  } catch (error) {
    const body = (error as { body?: unknown })?.body
    const status = Number((body as { status?: unknown })?.status) || 502
    throw new UnipileFailure(status, body ? JSON.stringify(body) : String(error))
  }
}

// Newest connections first; older ones are in the CachedConnection table.
async function getRecentConnections(accountId: string): Promise<Set<string>> {
  const hit = recentConnections.get(accountId)
  if (hit && Date.now() - hit.at < CONNECTIONS_TTL_MS) return hit.ids

  const { baseUrl, headers } = unipile()
  const res = await fetch(`${baseUrl}/api/v1/users/relations?account_id=${accountId}&limit=100`, {
    headers,
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok) throw new UnipileFailure(res.status, await res.text())

  const data = (await res.json()) as { items?: Array<{ member_id?: string }> }
  const ids = new Set((data.items || []).map((r) => String(r.member_id || "")).filter(Boolean))
  recentConnections.set(accountId, { ids, at: Date.now() })
  return ids
}

async function connectedAmong(accountId: string, providerIds: string[]): Promise<Set<string>> {
  const found = new Set<string>()
  if (providerIds.length === 0) return found

  const recent = await getRecentConnections(accountId)
  for (const id of providerIds) if (recent.has(id)) found.add(id)

  const cached = await prisma.cachedConnection.findMany({
    where: { accountId, providerId: { in: providerIds } },
    select: { providerId: true },
  })
  for (const row of cached) found.add(row.providerId)
  return found
}

// Latest inbound message time per sender, across the whole inbox.
async function getIncoming(accountId: string): Promise<Map<string, number>> {
  const hit = incoming.get(accountId)
  if (hit && Date.now() - hit.at < INCOMING_TTL_MS) return hit.latest

  const { baseUrl, headers } = unipile()
  const after = new Date(Date.now() - RESULT_WINDOW_MS).toISOString()
  const latest = new Map<string, number>()
  let cursor: string | null = null

  for (let page = 0; page < 4; page++) {
    let url = `${baseUrl}/api/v1/messages?account_id=${accountId}&limit=250&after=${encodeURIComponent(after)}`
    if (cursor) url += `&cursor=${encodeURIComponent(cursor)}`
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(20_000) })
    if (!res.ok) throw new UnipileFailure(res.status, await res.text())

    const data = (await res.json()) as {
      items?: Array<{ sender_id?: string; is_sender?: number | boolean; timestamp?: string }>
      cursor?: string | null
    }
    for (const message of data.items || []) {
      if (Number(message.is_sender) === 1 || message.is_sender === true || !message.sender_id) continue
      const at = Date.parse(message.timestamp || "")
      if (at > (latest.get(message.sender_id) || 0)) latest.set(message.sender_id, at)
    }
    cursor = data.cursor || null
    if (!cursor) break
  }

  incoming.set(accountId, { latest, at: Date.now() })
  return latest
}

type FailureKind = "disconnected" | "connected" | "pending" | "limit" | "permanent" | "transient"

function classify(error: unknown): FailureKind {
  if (!(error instanceof UnipileFailure)) return "transient"
  const text = error.message.toLowerCase()
  if (/disconnected_account|expired_credentials|invalid_credentials|missing_credentials/.test(text)) return "disconnected"
  if (/already_connected|already connected/.test(text)) return "connected"
  if (/already_invited|cannot_resend|pending/.test(text)) return "pending"
  if (error.status === 429 || /limit_exceeded|limit reached|too_many|too many/.test(text)) return "limit"
  if (error.status >= 500 || error.status === 408) return "transient"
  return "permanent"
}

function failureDetail(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error)
  try {
    const parsed = JSON.parse(raw) as { detail?: string; title?: string; message?: string }
    return (parsed.detail || parsed.message || parsed.title || raw).slice(0, 200)
  } catch {
    return raw.slice(0, 200)
  }
}

const SIGNED_OUT = "LinkedIn signed this account out. Reconnect it, then press Start."

async function pauseSequence(sequenceId: string) {
  await prisma.outreachSequence.update({ where: { id: sequenceId }, data: { status: "paused" } })
  await prisma.sequenceExecution.updateMany({
    where: { sequenceId, status: { in: OPEN_STATUSES } },
    data: { status: "paused", lastError: SIGNED_OUT },
  })
}

async function markAccepted(sequenceId: string, executionId: string, invite: { stepId: string; stepOrder: number }) {
  const already = await prisma.sequenceExecutionStep.findFirst({
    where: { executionId, status: "accepted" },
    select: { id: true },
  })
  if (already) return
  await prisma.sequenceExecutionStep.create({
    data: { executionId, stepId: invite.stepId, stepOrder: invite.stepOrder, status: "accepted", sentAt: new Date() },
  })
  await prisma.outreachSequence.update({ where: { id: sequenceId }, data: { acceptedCount: { increment: 1 } } })
}

// Records who accepted and who replied, and stops follow-ups to anyone who replied.
async function sweepResults(sequenceId: string, accountId: string) {
  const since = new Date(Date.now() - RESULT_WINDOW_MS)
  const executions = await prisma.sequenceExecution.findMany({
    where: {
      sequenceId,
      status: { in: [...OPEN_STATUSES, "completed"] },
      steps: { some: { status: "sent", sentAt: { gte: since } } },
    },
    select: {
      id: true,
      profileId: true,
      steps: {
        where: { status: { in: ["sent", "accepted"] } },
        select: { stepId: true, stepOrder: true, status: true, sentAt: true, step: { select: { type: true } } },
        orderBy: { sentAt: "asc" },
      },
    },
    take: 500,
  })
  if (executions.length === 0) return

  const awaitingAccept = executions.filter(
    (e) => e.steps.some((s) => s.status === "sent" && s.step.type === "invite") && !e.steps.some((s) => s.status === "accepted")
  )
  const connected = await connectedAmong(accountId, awaitingAccept.map((e) => e.profileId))
  for (const execution of awaitingAccept) {
    if (!connected.has(execution.profileId)) continue
    const invite = execution.steps.find((s) => s.status === "sent" && s.step.type === "invite")!
    await markAccepted(sequenceId, execution.id, invite)
  }

  const inbox = await getIncoming(accountId)
  for (const execution of executions) {
    const firstSent = execution.steps.find((s) => s.status === "sent")?.sentAt?.getTime()
    const lastReply = inbox.get(execution.profileId)
    if (!firstSent || !lastReply || lastReply <= firstSent) continue
    await prisma.sequenceExecution.update({
      where: { id: execution.id },
      data: { status: "replied", completedAt: new Date(lastReply), nextActionAt: null, lastError: null },
    })
  }
}

async function closeIfDone(sequenceId: string) {
  const open = await prisma.sequenceExecution.count({
    where: { sequenceId, status: { in: OPEN_STATUSES } },
  })
  if (open === 0) {
    await prisma.outreachSequence.updateMany({
      where: { id: sequenceId, status: "active" },
      data: { status: "completed" },
    })
  }
}

interface RunContext {
  sequence: SequenceWithSteps
  accountId: string
  sendsLeft: number
  budget: number
  summary: RunSummary
}

async function advance(ctx: RunContext, execution: SequenceExecution) {
  const { sequence, accountId, summary } = ctx
  const profile = JSON.parse(execution.profileData) as Profile
  let stepIndex = execution.currentStep

  const save = (data: Prisma.SequenceExecutionUpdateInput) =>
    prisma.sequenceExecution.update({
      where: { id: execution.id },
      data: { currentStep: stepIndex, status: "in_progress", startedAt: execution.startedAt ?? new Date(), ...data },
    })

  const record = (step: Step, status: string, extra: { error?: string; messageId?: string | null } = {}) =>
    prisma.sequenceExecutionStep.create({
      data: {
        executionId: execution.id,
        stepId: step.id,
        stepOrder: step.order,
        status,
        sentAt: status === "sent" ? new Date() : null,
        error: extra.error,
        messageId: extra.messageId ?? undefined,
      },
    })

  while (true) {
    const step = sequence.steps[stepIndex]
    if (!step) {
      await save({ status: "completed", completedAt: new Date(), nextActionAt: null, lastError: null })
      summary.finished++
      return
    }

    if (step.type === "wait") {
      let from = Date.now()

      // A wait right after an invitation counts from the day they accept
      const invite = sequence.steps[stepIndex - 1]?.type === "invite"
        ? await prisma.sequenceExecutionStep.findFirst({
            where: { executionId: execution.id, status: "sent", step: { type: "invite" } },
            orderBy: { sentAt: "asc" },
          })
        : null
      if (invite) {
        const accepted = await prisma.sequenceExecutionStep.findFirst({
          where: { executionId: execution.id, status: "accepted" },
          select: { sentAt: true },
        })
        if (accepted) {
          from = (accepted.sentAt ?? new Date()).getTime()
        } else if ((await connectedAmong(accountId, [profile.id])).has(profile.id)) {
          await markAccepted(sequence.id, execution.id, invite)
        } else if (Date.now() - (invite.sentAt ?? invite.createdAt).getTime() > ACCEPT_GIVE_UP_MS) {
          await save({ status: "not_accepted", completedAt: new Date(), nextActionAt: null, lastError: null })
          summary.finished++
          return
        } else {
          await save({ nextActionAt: new Date(Date.now() + ACCEPT_RECHECK_MS), lastError: null })
          summary.waiting++
          return
        }
      }

      const due = from + stepDelayMs(step)
      stepIndex++
      if (due <= Date.now()) continue
      await save({ nextActionAt: new Date(due), lastError: null })
      summary.waiting++
      return
    }

    let connected = (await connectedAmong(accountId, [profile.id])).has(profile.id)
    if (!connected && step.type === "message") {
      // LinkedIn said "already connected" at the invite step before our lists caught up
      const skippedInvite = await prisma.sequenceExecutionStep.findFirst({
        where: { executionId: execution.id, status: "skipped", step: { type: "invite" } },
        select: { id: true },
      })
      connected = !!skippedInvite
    }

    if (step.type === "invite" && connected) {
      await record(step, "skipped", { error: "Already connected" })
      stepIndex++
      continue
    }

    if (step.type === "message" && !connected) {
      const invite = await prisma.sequenceExecutionStep.findFirst({
        where: { executionId: execution.id, status: "sent", step: { type: "invite" } },
        orderBy: { sentAt: "asc" },
      })
      if (!invite) {
        await record(step, "failed", { error: "Not connected" })
        await save({
          status: "failed",
          nextActionAt: null,
          lastError: "Not connected on LinkedIn. Add an invitation step before this message.",
        })
        await prisma.outreachSequence.update({ where: { id: sequence.id }, data: { failedCount: { increment: 1 } } })
        summary.failed++
        return
      }
      if (Date.now() - (invite.sentAt ?? invite.createdAt).getTime() > ACCEPT_GIVE_UP_MS) {
        await save({ status: "not_accepted", completedAt: new Date(), nextActionAt: null, lastError: null })
        summary.finished++
        return
      }
      await save({ nextActionAt: new Date(Date.now() + ACCEPT_RECHECK_MS), lastError: null })
      summary.waiting++
      return
    }

    const blockKey = `${accountId}:${step.type}`
    const blockedUntil = sendBlockedUntil.get(blockKey) || 0
    if (blockedUntil > Date.now()) {
      await save({ nextActionAt: new Date(blockedUntil) })
      summary.inviteLimit = true
      summary.waiting++
      return
    }

    if (ctx.sendsLeft <= 0) {
      if (stepIndex !== execution.currentStep) await save({ nextActionAt: new Date() })
      if (ctx.budget <= 0) summary.heldForLimit++
      else summary.waiting++
      return
    }

    const claimed = await prisma.sequenceExecution.updateMany({
      where: { id: execution.id, status: { in: OPEN_STATUSES }, nextActionAt: execution.nextActionAt },
      data: { nextActionAt: new Date(Date.now() + CLAIM_MS) },
    })
    if (claimed.count === 0) return

    const text = stepText(step, profile)

    try {
      let messageId: string | null = null
      if (step.type === "invite") {
        await sendInvite(accountId, profile.id, text)
      } else {
        if (!text) throw new UnipileFailure(400, "This step has no message to send.")
        messageId = await sendMessage(accountId, profile.id, text)
      }

      await record(step, "sent", { messageId })
      await prisma.outreachSequence.update({ where: { id: sequence.id }, data: { sentCount: { increment: 1 } } })
      stepIndex++
      await save({ nextActionAt: new Date(), lastError: null, retryCount: 0 })

      ctx.sendsLeft--
      ctx.budget--
      summary.sent++
      summary.sentToday++
      const low = Math.min(sequence.delayMinMinutes, sequence.delayMaxMinutes)
      const high = Math.max(sequence.delayMinMinutes, sequence.delayMaxMinutes)
      nextSendAt.set(sequence.id, Date.now() + (low + Math.random() * (high - low)) * MINUTE)
      if (ctx.sendsLeft > 0) await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 2000))
      continue
    } catch (error) {
      const kind = classify(error)

      if (kind === "disconnected") {
        await save({ nextActionAt: execution.nextActionAt })
        await pauseSequence(sequence.id)
        summary.paused = SIGNED_OUT
        throw new RunStopped()
      }

      if (kind === "connected") {
        await record(step, "skipped", { error: "Already connected" })
        stepIndex++
        continue
      }

      if (kind === "pending") {
        await record(step, "sent")
        stepIndex++
        await save({ nextActionAt: new Date(), lastError: null })
        continue
      }

      if (kind === "limit") {
        const until = Date.now() + DAY
        sendBlockedUntil.set(blockKey, until)
        await save({
          nextActionAt: new Date(until),
          lastError: "LinkedIn's sending limit is reached. Trying again tomorrow.",
        })
        summary.inviteLimit = true
        summary.waiting++
        return
      }

      const detail = failureDetail(error)
      const giveUp = kind === "permanent" || execution.retryCount + 1 >= MAX_RETRIES
      await record(step, "failed", { error: detail })
      await save({
        status: giveUp ? "failed" : "in_progress",
        retryCount: { increment: 1 },
        lastError: detail,
        nextActionAt: giveUp ? null : new Date(Date.now() + RETRY_AFTER_MS),
      })
      if (giveUp) {
        await prisma.outreachSequence.update({ where: { id: sequence.id }, data: { failedCount: { increment: 1 } } })
        summary.failed++
      } else {
        summary.retrying++
      }
      return
    }
  }
}

async function loadSequence(sequenceId: string, userId?: string) {
  return prisma.outreachSequence.findFirst({
    where: { id: sequenceId, ...(userId ? { userId } : {}) },
    include: {
      steps: { orderBy: { order: "asc" }, include: { template: true } },
      user: { select: { unipileAccountId: true } },
    },
  })
}

async function countSentToday(sequenceId: string): Promise<number> {
  return prisma.sequenceExecutionStep.count({
    where: {
      status: "sent",
      sentAt: { gte: new Date(Date.now() - DAY) },
      step: { type: { in: ["invite", "message"] } },
      execution: { sequenceId },
    },
  })
}

async function sendGapOpen(sequence: SequenceWithSteps): Promise<boolean> {
  let next = nextSendAt.get(sequence.id)
  if (next === undefined) {
    const last = await prisma.sequenceExecutionStep.findFirst({
      where: { status: "sent", execution: { sequenceId: sequence.id } },
      orderBy: { sentAt: "desc" },
      select: { sentAt: true },
    })
    next = last?.sentAt ? last.sentAt.getTime() + sequence.delayMinMinutes * MINUTE : 0
    nextSendAt.set(sequence.id, next)
  }
  return Date.now() >= next
}

export async function runSequence(
  sequenceId: string,
  options: { manual?: boolean; userId?: string } = {}
): Promise<RunSummary> {
  const sequence = await loadSequence(sequenceId, options.userId)
  if (!sequence) throw new SequenceRunError("Sequence not found", 404)
  if (sequence.status !== "active") throw new SequenceRunError("Sequence is not active", 400)

  const accountId = sequence.user.unipileAccountId
  if (!accountId) throw new SequenceRunError("LinkedIn not connected", 409)

  const summary: RunSummary = {
    sent: 0,
    waiting: 0,
    heldForLimit: 0,
    failed: 0,
    retrying: 0,
    finished: 0,
    sentToday: await countSentToday(sequence.id),
    dailyLimit: sequence.dailyLimit,
  }

  try {
    if (options.manual || Date.now() - (lastSweepAt.get(sequence.id) || 0) > SWEEP_EVERY_MS) {
      lastSweepAt.set(sequence.id, Date.now())
      await sweepResults(sequence.id, accountId)
    }

    const budget = Math.max(0, sequence.dailyLimit - summary.sentToday)
    const sendsLeft = options.manual
      ? Math.min(budget, MANUAL_BATCH)
      : withinSendingHours(sequence) && (await sendGapOpen(sequence)) ? Math.min(budget, 1) : 0
    const ctx: RunContext = { sequence, accountId, sendsLeft, budget, summary }

    const ready = await prisma.sequenceExecution.findMany({
      where: { sequenceId: sequence.id, status: { in: OPEN_STATUSES }, nextActionAt: { lte: new Date() } },
      orderBy: { nextActionAt: "asc" },
      take: READY_BATCH,
    })
    for (const execution of ready) await advance(ctx, execution)
  } catch (error) {
    if (error instanceof UnipileFailure && classify(error) === "disconnected") {
      summary.paused = SIGNED_OUT
      await pauseSequence(sequence.id)
    } else if (!(error instanceof RunStopped)) {
      throw error
    }
  }

  if (!summary.paused) await closeIfDone(sequence.id)
  return summary
}

let ticking = false

async function tick() {
  if (ticking) return
  ticking = true
  try {
    const active = await prisma.outreachSequence.findMany({
      where: { status: "active" },
      select: { id: true },
    })
    for (const { id } of active) {
      try {
        await runSequence(id)
      } catch (error) {
        console.error(`Sequence ${id} run failed:`, error)
      }
    }

    const finished = await prisma.outreachSequence.findMany({
      where: {
        status: "completed",
        updatedAt: { gte: new Date(Date.now() - RESULT_WINDOW_MS) },
        user: { unipileAccountId: { not: null } },
      },
      select: { id: true, user: { select: { unipileAccountId: true } } },
    })
    for (const sequence of finished) {
      if (Date.now() - (lastSweepAt.get(sequence.id) || 0) < SWEEP_EVERY_MS) continue
      lastSweepAt.set(sequence.id, Date.now())
      try {
        await sweepResults(sequence.id, sequence.user.unipileAccountId!)
      } catch (error) {
        console.error(`Sequence ${sequence.id} results check failed:`, error)
      }
    }
  } catch (error) {
    console.error("Sequence runner tick failed:", error)
  } finally {
    ticking = false
  }
}

const globalForRunner = globalThis as unknown as { sequenceRunner?: ReturnType<typeof setInterval> }

export function startSequenceRunner() {
  if (globalForRunner.sequenceRunner) return
  globalForRunner.sequenceRunner = setInterval(tick, TICK_MS)
  globalForRunner.sequenceRunner.unref?.()
  console.log("Sequence runner started")
}
