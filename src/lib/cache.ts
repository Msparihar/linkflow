import { prisma } from "@/lib/prisma"
import { getUnipileClient } from "@/lib/unipile"

const CACHE_TTL = {
  connections: 6 * 60 * 60 * 1000,   // 6 hours
  profiles: 24 * 60 * 60 * 1000,     // 24 hours
}

function isStale(cachedAt: Date, ttl: number): boolean {
  return Date.now() - cachedAt.getTime() > ttl
}

// ==========================================
// Connections Cache
// ==========================================

export async function getCachedConnections(accountId: string) {
  const connections = await prisma.cachedConnection.findMany({
    where: { accountId },
  })

  if (connections.length === 0) return null

  // Check staleness based on any entry (they're all synced together)
  if (isStale(connections[0].cachedAt, CACHE_TTL.connections)) {
    return { data: connections.map((c) => c.data), stale: true }
  }

  return { data: connections.map((c) => c.data), stale: false }
}

export async function getCachedConnectionsPaginated(
  accountId: string,
  skip: number,
  take: number
) {
  const [connections, total] = await Promise.all([
    prisma.cachedConnection.findMany({
      where: { accountId },
      skip,
      take,
    }),
    prisma.cachedConnection.count({ where: { accountId } }),
  ])

  if (connections.length === 0 && skip === 0) return null

  const stale =
    connections.length > 0 &&
    isStale(connections[0].cachedAt, CACHE_TTL.connections)

  return {
    data: connections.map((c) => c.data),
    total,
    hasMore: skip + take < total,
    stale,
  }
}

export async function syncConnections(accountId: string) {
  const client = getUnipileClient()
  const allConnections: Array<{ providerId: string; data: Record<string, unknown> }> = []
  let nextCursor: string | null = null

  do {
    const params: { account_id: string; limit: number; cursor?: string } = {
      account_id: accountId,
      limit: 100,
    }
    if (nextCursor) params.cursor = nextCursor

    const response = await client.users.getAllRelations(params)

    const connections = (response.items || []).map((relation: Record<string, unknown>) => ({
      providerId: String(relation.member_id || ""),
      data: {
        id: relation.member_id,
        firstName: relation.first_name || "",
        lastName: relation.last_name || "",
        headline: relation.headline || "",
        profilePicture: relation.profile_picture_url || "",
      },
    }))

    allConnections.push(...connections)
    nextCursor = response.cursor as string | null
  } while (nextCursor)

  // Bulk upsert — delete old + insert fresh in a transaction
  const now = new Date()
  const rows = allConnections
    .filter((c) => c.providerId)
    .map((c) => ({
      accountId,
      providerId: c.providerId,
      data: c.data,
      cachedAt: now,
    }))

  await prisma.$transaction([
    prisma.cachedConnection.deleteMany({ where: { accountId } }),
    prisma.cachedConnection.createMany({ data: rows }),
  ])

  return allConnections.map((c) => c.data)
}

// ==========================================
// Profile Cache
// ==========================================

export async function getCachedProfile(accountId: string, providerId: string) {
  const cached = await prisma.cachedProfile.findUnique({
    where: { accountId_providerId: { accountId, providerId } },
  })

  if (!cached) return null
  if (isStale(cached.cachedAt, CACHE_TTL.profiles)) return null

  return cached.data as Record<string, unknown>
}

export async function setCachedProfile(
  accountId: string,
  providerId: string,
  data: Record<string, unknown>
) {
  await prisma.cachedProfile.upsert({
    where: { accountId_providerId: { accountId, providerId } },
    update: { data, cachedAt: new Date() },
    create: { accountId, providerId, data, cachedAt: new Date() },
  })
}

// ==========================================
// Cache Invalidation
// ==========================================

export async function invalidateCache(
  accountId: string,
  type?: "connections" | "profiles"
) {
  if (!type || type === "connections") {
    await prisma.cachedConnection.deleteMany({ where: { accountId } })
  }
  if (!type || type === "profiles") {
    await prisma.cachedProfile.deleteMany({ where: { accountId } })
  }
}
