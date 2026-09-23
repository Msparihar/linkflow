import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import { getAccessToken, listAdminOrgs, LinkedinAuthError } from "@/lib/linkedin-pages"

// GET: connection status plus the company pages the member can post to
export async function GET() {
  const cookieStore = await cookies()
  const userId = cookieStore.get("user_id")?.value
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const auth = await prisma.linkedinPageAuth.findUnique({ where: { userId } })
  if (!auth) {
    return NextResponse.json({ connected: false })
  }

  const status = {
    connected: true,
    scope: auth.scope,
    expiresAt: auth.expiresAt,
    hasRefreshToken: !!auth.refreshToken,
    refreshExpiresAt: auth.refreshExpiresAt,
  }

  try {
    const token = await getAccessToken(userId)
    const organizations = await listAdminOrgs(token)
    return NextResponse.json({ ...status, organizations })
  } catch (err) {
    const expired = err instanceof LinkedinAuthError
    return NextResponse.json({
      ...status,
      connected: !expired,
      organizations: [],
      error: err instanceof Error ? err.message : "Failed to load company pages",
    })
  }
}

// DELETE: forget the stored LinkedIn page token
export async function DELETE() {
  const cookieStore = await cookies()
  const userId = cookieStore.get("user_id")?.value
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  await prisma.linkedinPageAuth.deleteMany({ where: { userId } })
  return NextResponse.json({ success: true })
}
