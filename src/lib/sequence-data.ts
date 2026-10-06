import { prisma } from "@/lib/prisma"

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

export interface TargetProfile {
  id: string
  firstName?: string
  lastName?: string
  headline?: string
  profilePicture?: string
  publicIdentifier?: string
  location?: string
}

const OPEN = ["pending", "in_progress", "paused"]

export async function getSequenceStats(ids: string[]): Promise<Map<string, SequenceStats>> {
  const stats = new Map<string, SequenceStats>()
  if (ids.length === 0) return stats
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const [byStatus, byStep, sentToday, lastErrors] = await Promise.all([
    prisma.sequenceExecution.groupBy({
      by: ["sequenceId", "status"],
      where: { sequenceId: { in: ids } },
      _count: { _all: true },
    }),
    prisma.$queryRaw<Array<{ sequenceId: string; type: string; status: string; people: number }>>`
      SELECT e."sequenceId", s."type", es."status", COUNT(DISTINCT es."executionId")::int AS people
      FROM "SequenceExecutionStep" es
      JOIN "SequenceExecution" e ON e."id" = es."executionId"
      JOIN "SequenceStep" s ON s."id" = es."stepId"
      WHERE e."sequenceId" = ANY(${ids}::text[]) AND es."status" IN ('sent', 'accepted')
      GROUP BY 1, 2, 3
    `,
    prisma.$queryRaw<Array<{ sequenceId: string; sent: number }>>`
      SELECT e."sequenceId", COUNT(*)::int AS sent
      FROM "SequenceExecutionStep" es
      JOIN "SequenceExecution" e ON e."id" = es."executionId"
      JOIN "SequenceStep" s ON s."id" = es."stepId"
      WHERE e."sequenceId" = ANY(${ids}::text[]) AND es."status" = 'sent'
        AND s."type" IN ('invite', 'message') AND es."sentAt" >= ${dayAgo}
      GROUP BY 1
    `,
    prisma.sequenceExecution.findMany({
      where: { sequenceId: { in: ids }, status: { in: OPEN }, lastError: { not: null } },
      orderBy: { updatedAt: "desc" },
      distinct: ["sequenceId"],
      select: { sequenceId: true, lastError: true },
    }),
  ])

  for (const id of ids) {
    const status = (name: string) =>
      byStatus.find((row) => row.sequenceId === id && row.status === name)?._count._all || 0
    const step = (type: string, name: string) =>
      byStep.find((row) => row.sequenceId === id && row.type === type && row.status === name)?.people || 0
    stats.set(id, {
      invited: step("invite", "sent"),
      accepted: step("invite", "accepted"),
      messaged: step("message", "sent"),
      replied: status("replied"),
      failed: status("failed"),
      inProgress: OPEN.reduce((sum, name) => sum + status(name), 0),
      sentToday: sentToday.find((row) => row.sequenceId === id)?.sent || 0,
      notice: lastErrors.find((row) => row.sequenceId === id)?.lastError || null,
    })
  }
  return stats
}

// Gives every target a place in the sequence; people removed earlier start over.
export async function enrolTargets(sequenceId: string, profiles: TargetProfile[]): Promise<number> {
  if (profiles.length === 0) return 0
  const existing = await prisma.sequenceExecution.findMany({
    where: { sequenceId, profileId: { in: profiles.map((p) => p.id) } },
    select: { id: true, profileId: true, status: true },
  })
  const known = new Map(existing.map((e) => [e.profileId, e]))

  const fresh = profiles.filter((p) => !known.has(p.id))
  if (fresh.length > 0) {
    await prisma.sequenceExecution.createMany({
      data: fresh.map((profile) => ({
        sequenceId,
        profileId: profile.id,
        profileName: `${profile.firstName || ""} ${profile.lastName || ""}`.trim(),
        profileData: JSON.stringify(profile),
        status: "pending",
        currentStep: 0,
        nextActionAt: new Date(),
      })),
    })
  }

  const removed = existing.filter((e) => e.status === "removed").map((e) => e.id)
  if (removed.length > 0) {
    await prisma.sequenceExecution.updateMany({
      where: { id: { in: removed } },
      data: { status: "pending", currentStep: 0, nextActionAt: new Date(), lastError: null, retryCount: 0, completedAt: null },
    })
  }
  return fresh.length + removed.length
}

export function mergeTargets(current: TargetProfile[], added: TargetProfile[]): TargetProfile[] {
  const seen = new Set(current.map((p) => p.id))
  return [...current, ...added.filter((p) => p.id && !seen.has(p.id) && seen.add(p.id))]
}
