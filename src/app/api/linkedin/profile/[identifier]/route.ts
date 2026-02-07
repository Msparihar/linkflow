import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getCachedProfile, setCachedProfile } from "@/lib/cache"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ identifier: string }> }
) {
  const cookieStore = await cookies()
  const userId = cookieStore.get("user_id")?.value
  const unipileAccountId = cookieStore.get("unipile_account_id")?.value

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  if (!unipileAccountId) {
    return NextResponse.json({ error: "LinkedIn not connected" }, { status: 401 })
  }

  const { identifier } = await params

  if (!identifier) {
    return NextResponse.json({ error: "Profile identifier is required" }, { status: 400 })
  }

  try {
    // Check cache first
    const cached = await getCachedProfile(unipileAccountId, identifier)
    if (cached) {
      return NextResponse.json(cached)
    }

    // Cache miss — fetch from Unipile
    const baseUrl = process.env.UNIPILE_API_URL
    const token = process.env.UNIPILE_ACCESS_TOKEN

    if (!baseUrl || !token) {
      return NextResponse.json({ error: "Unipile not configured" }, { status: 500 })
    }

    const profileResponse = await fetch(
      `${baseUrl}/api/v1/users/${encodeURIComponent(identifier)}?account_id=${unipileAccountId}`,
      {
        method: "GET",
        headers: {
          "X-API-KEY": token,
          "Accept": "application/json",
        },
      }
    )

    if (!profileResponse.ok) {
      const errorText = await profileResponse.text()
      console.error("Profile lookup error:", errorText)
      return NextResponse.json({ error: "Profile not found" }, { status: profileResponse.status })
    }

    const profile = await profileResponse.json()

    const profileData = {
      id: profile.provider_id,
      providerId: profile.provider_id,
      publicIdentifier: profile.public_identifier,
      firstName: profile.first_name || '',
      lastName: profile.last_name || '',
      headline: profile.headline || '',
      profilePicture: profile.profile_picture_url || '',
      location: profile.location || '',
    }

    // Cache for next time (fire and forget)
    setCachedProfile(unipileAccountId, identifier, profileData).catch(() => {})

    // Also cache by provider_id if different from identifier
    if (profile.provider_id && profile.provider_id !== identifier) {
      setCachedProfile(unipileAccountId, profile.provider_id, profileData).catch(() => {})
    }

    return NextResponse.json(profileData)
  } catch (error) {
    console.error("Profile lookup error:", error)
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
  }
}
