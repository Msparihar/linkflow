import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getUnipileClient } from "@/lib/unipile"

export async function GET(request: NextRequest) {
  const cookieStore = await cookies()
  const userId = cookieStore.get("user_id")?.value
  const unipileAccountId = cookieStore.get("unipile_account_id")?.value
  const accessToken = cookieStore.get("linkedin_access_token")?.value

  // Check for user session
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  // Get pagination params from query string
  const searchParams = request.nextUrl.searchParams
  const cursor = searchParams.get("cursor")
  const limit = parseInt(searchParams.get("limit") || "20", 10)
  const fetchAll = searchParams.get("fetchAll") === "true"

  // Try Unipile first
  if (unipileAccountId) {
    try {
      const client = getUnipileClient()

      // If fetching all connections (for search), paginate through everything
      if (fetchAll) {
        const allConnections: Array<{
          id: unknown
          firstName: string
          lastName: string
          headline: string
          profilePicture: string
        }> = []
        let nextCursor: string | null = null

        do {
          const params: { account_id: string; limit: number; cursor?: string } = {
            account_id: unipileAccountId,
            limit: 100, // Max per request
          }
          if (nextCursor) {
            params.cursor = nextCursor
          }

          const relationsResponse = await client.users.getAllRelations(params)

          const connections = relationsResponse.items?.map((relation: Record<string, unknown>) => ({
            id: relation.member_id,
            firstName: relation.first_name || '',
            lastName: relation.last_name || '',
            headline: relation.headline || '',
            profilePicture: relation.profile_picture_url || '',
          })) || []

          allConnections.push(...connections)
          nextCursor = relationsResponse.cursor as string | null
        } while (nextCursor)

        return NextResponse.json({
          connections: allConnections,
          cursor: null,
          total: allConnections.length,
        })
      }

      // Regular paginated fetch
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
