import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
  const cookieStore = await cookies()
  const userId = cookieStore.get("user_id")?.value
  const unipileAccountId = cookieStore.get("unipile_account_id")?.value

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  if (!unipileAccountId) {
    return NextResponse.json({ error: "LinkedIn not connected" }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get("q")
  const limit = parseInt(searchParams.get("limit") || "20", 10)

  if (!query || query.trim().length < 2) {
    return NextResponse.json({ error: "Search query must be at least 2 characters" }, { status: 400 })
  }

  try {
    const baseUrl = process.env.UNIPILE_API_URL
    const token = process.env.UNIPILE_ACCESS_TOKEN

    if (!baseUrl || !token) {
      return NextResponse.json({ error: "Unipile not configured" }, { status: 500 })
    }

    // Use the LinkedIn search endpoint with POST
    // Using "classic" API for basic LinkedIn search
    const searchResponse = await fetch(
      `${baseUrl}/api/v1/linkedin/search?account_id=${unipileAccountId}`,
      {
        method: "POST",
        headers: {
          "X-API-KEY": token,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          api: "classic",
          category: "people",
          keywords: query.trim(),
          limit,
        }),
      }
    )

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text()
      console.error("LinkedIn search error:", errorText)
      return NextResponse.json({ error: "Search failed" }, { status: searchResponse.status })
    }

    const data = await searchResponse.json()

    const profiles = data.items?.map((profile: Record<string, unknown>) => ({
      id: profile.id,
      firstName: profile.first_name || (profile.name as string)?.split(' ')[0] || '',
      lastName: profile.last_name || (profile.name as string)?.split(' ').slice(1).join(' ') || '',
      headline: profile.headline || '',
      profilePicture: profile.profile_picture_url || '',
      publicIdentifier: profile.public_identifier || '',
      profileUrl: profile.profile_url || '',
      connectionDegree: profile.network_distance === 'DISTANCE_1' ? 1
        : profile.network_distance === 'DISTANCE_2' ? 2
        : profile.network_distance === 'DISTANCE_3' ? 3
        : undefined,
      location: profile.location || '',
    })) || []

    return NextResponse.json({
      profiles,
      cursor: data.cursor,
      total: data.paging?.total_count,
    })
  } catch (error) {
    console.error("Search error:", error)
    return NextResponse.json({ error: "Failed to search profiles" }, { status: 500 })
  }
}
