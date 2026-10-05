import { cache } from "react"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export type LinkedinStatus = "connected" | "expired" | "none"

export const DISCONNECTED_COOKIE = "linkedin_disconnected"

const HEALTH_TTL_MS = 60_000
const DEAD_SOURCE_STATUSES = new Set(["CREDENTIALS", "STOPPED"])
const DISCONNECTED_ERRORS = /disconnected_account|expired_credentials|invalid_credentials|missing_credentials/

const health = new Map<string, { live: boolean; at: number }>()

// The linked LinkedIn account is read from the user row, so a relink reaches every open session.
export const getSession = cache(
  async (): Promise<{ userId: string | null; accountId: string | null }> => {
    const cookieStore = await cookies()
    const userId = cookieStore.get("user_id")?.value
    if (!userId) return { userId: null, accountId: null }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { unipileAccountId: true },
    })
    if (!user) return { userId: null, accountId: null }

    const disconnected = cookieStore.has(DISCONNECTED_COOKIE)
    return { userId, accountId: disconnected ? null : user.unipileAccountId }
  }
)

export async function requireLinkedin(): Promise<
  { userId: string; accountId: string } | NextResponse
> {
  const { userId, accountId } = await getSession()
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
  if (!accountId) {
    return NextResponse.json(
      { error: "LinkedIn not connected", code: "LINKEDIN_NOT_CONNECTED" },
      { status: 401 }
    )
  }
  return { userId, accountId }
}

async function isAccountLive(accountId: string): Promise<boolean> {
  const hit = health.get(accountId)
  if (hit && Date.now() - hit.at < HEALTH_TTL_MS) return hit.live

  let live = true
  try {
    const res = await fetch(`${process.env.UNIPILE_API_URL}/api/v1/accounts/${accountId}`, {
      headers: {
        "X-API-KEY": process.env.UNIPILE_ACCESS_TOKEN || "",
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    })
    if (res.status === 404) {
      live = false
    } else if (res.ok) {
      const account = (await res.json()) as { sources?: Array<{ status?: string }> }
      live = !(account.sources || []).some((s) => DEAD_SOURCE_STATUSES.has(s.status || ""))
    }
  } catch {
    // Unipile unreachable: don't lock the user out over a status check.
  }

  health.set(accountId, { live, at: Date.now() })
  return live
}

export async function getLinkedinStatus(): Promise<LinkedinStatus> {
  const { accountId } = await getSession()
  if (!accountId) return "none"
  return (await isAccountLive(accountId)) ? "connected" : "expired"
}

export function forgetLinkedinHealth(accountId: string) {
  health.delete(accountId)
}

// Turns a failed Unipile call into a response the UI can explain.
export function unipileError(
  accountId: string,
  body: unknown,
  fallback: string,
  status = 502
): NextResponse {
  const text = typeof body === "string" ? body : JSON.stringify(body ?? "")
  if (DISCONNECTED_ERRORS.test(text)) {
    health.set(accountId, { live: false, at: Date.now() })
    return NextResponse.json(
      {
        error: "LinkedIn signed you out. Reconnect your account to continue.",
        code: "LINKEDIN_DISCONNECTED",
      },
      { status: 409 }
    )
  }
  // A 401 from Unipile is about LinkedIn, not about who is signed in here.
  return NextResponse.json({ error: fallback }, { status: status === 401 ? 502 : status })
}
