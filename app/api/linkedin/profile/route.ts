import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getUnipileClient } from "@/lib/unipile"

export async function GET() {
  const cookieStore = await cookies()
  const userId = cookieStore.get("user_id")?.value
  const unipileAccountId = cookieStore.get("unipile_account_id")?.value
  const accessToken = cookieStore.get("linkedin_access_token")?.value

  // Check for user session
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  // Try Unipile first, then fall back to legacy LinkedIn API
  if (unipileAccountId) {
    try {
      const client = getUnipileClient()

      // Get account info using SDK
      const account = await client.account.getOne(unipileAccountId)

      // Get own profile for more details
      const profile = await client.users.getOwnProfile(unipileAccountId)

      return NextResponse.json({
        name: profile.name || account.name || 'LinkedIn User',
        picture: profile.profile_picture_url || null,
        email: account.connection_params?.im_address || null,
      })
    } catch (error) {
      console.error("Profile fetch error:", error)
      return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
  }

  // Legacy LinkedIn API fallback
  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Fetch user profile using OpenID Connect userinfo endpoint
    const profileResponse = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!profileResponse.ok) {
      return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
    }

    const profile = await profileResponse.json()

    return NextResponse.json({
      name: profile.name,
      picture: profile.picture,
      email: profile.email,
    })
  } catch (error) {
    console.error("Profile fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
