import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getUnipileClient } from "@/lib/unipile"
import {
  getCachedConnections,
  getCachedConnectionsPaginated,
  syncConnections,
} from "@/lib/cache"

export async function GET(request: NextRequest) {
  const cookieStore = await cookies()
  const userId = cookieStore.get("user_id")?.value
  const unipileAccountId = cookieStore.get("unipile_account_id")?.value
  const accessToken = cookieStore.get("linkedin_access_token")?.value

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const cursor = searchParams.get("cursor")
  const limit = parseInt(searchParams.get("limit") || "20", 10)
  const fetchAll = searchParams.get("fetchAll") === "true"

  if (unipileAccountId) {
    try {
      // fetchAll — serve from cache, sync in background if stale
      if (fetchAll) {
        const cached = await getCachedConnections(unipileAccountId)

        if (cached && !cached.stale) {
          // Fresh cache — return immediately
          return NextResponse.json({
            connections: cached.data,
            cursor: null,
            total: cached.data.length,
          })
        }

        if (cached && cached.stale) {
          // Stale cache — return stale data, trigger background sync
          // (fire and forget — don't await)
          syncConnections(unipileAccountId).catch((err) =>
            console.error("Background connection sync failed:", err)
          )
          return NextResponse.json({
            connections: cached.data,
            cursor: null,
            total: cached.data.length,
          })
        }

        // No cache at all — must sync now (first load)
        const connections = await syncConnections(unipileAccountId)
        return NextResponse.json({
          connections,
          cursor: null,
          total: connections.length,
        })
      }

      // Paginated fetch — use DB cache if available, else Unipile
      const offset = parseInt(cursor || "0", 10)
      const cachedPage = await getCachedConnectionsPaginated(
        unipileAccountId,
        offset,
        limit
      )

      if (cachedPage) {
        // Serve from cache, trigger background sync if stale
        if (cachedPage.stale) {
          syncConnections(unipileAccountId).catch((err) =>
            console.error("Background connection sync failed:", err)
          )
        }
        return NextResponse.json({
          connections: cachedPage.data,
          cursor: cachedPage.hasMore ? String(offset + limit) : null,
        })
      }

      // No cache — fall through to Unipile
      const client = getUnipileClient()
      const params: { account_id: string; limit: number; cursor?: string } = {
        account_id: unipileAccountId,
        limit,
      }
      if (cursor) {
        params.cursor = cursor
      }

      const relationsResponse = await client.users.getAllRelations(params)

      const connections = relationsResponse.items?.map((relation: Record<string, unknown>) => ({
        id: relation.member_id,
        firstName: relation.first_name || '',
        lastName: relation.last_name || '',
        headline: relation.headline || '',
        profilePicture: relation.profile_picture_url || '',
      })) || []

      return NextResponse.json({
        connections,
        cursor: relationsResponse.cursor,
      })
    } catch (error: unknown) {
      const err = error as { body?: unknown; message?: string }
      console.error("Connections fetch error:", error)
      console.error("Error body:", JSON.stringify(err.body, null, 2))
      return NextResponse.json({ error: "Internal server error", details: err.body || err.message }, { status: 500 })
    }
  }

  // Legacy LinkedIn API fallback
  if (!accessToken) {
    return NextResponse.json({ error: "LinkedIn not connected" }, { status: 401 })
  }

  try {
    const connectionsResponse = await fetch(
      `https://api.linkedin.com/v2/connections?q=viewer&start=0&count=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
        },
      }
    )

    if (!connectionsResponse.ok) {
      const errorData = await connectionsResponse.text()
      console.error("Connections fetch failed:", errorData)
      return NextResponse.json({ error: "Failed to fetch connections" }, { status: connectionsResponse.status })
    }

    const data = await connectionsResponse.json()

    const connections = data.elements?.map((element: { to: string }) => ({
      id: element.to,
      firstName: "",
      lastName: "",
      headline: "",
      profilePicture: "",
    })) || []

    return NextResponse.json({ connections, paging: data.paging })
  } catch (error) {
    console.error("Connections fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
