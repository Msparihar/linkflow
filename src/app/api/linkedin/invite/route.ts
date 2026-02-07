import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const userId = cookieStore.get("user_id")?.value
  const unipileAccountId = cookieStore.get("unipile_account_id")?.value

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  if (!unipileAccountId) {
    return NextResponse.json({ error: "LinkedIn not connected" }, { status: 401 })
  }

  try {
    const { profileId, message } = await request.json()

    if (!profileId) {
      return NextResponse.json({ error: "Profile ID is required" }, { status: 400 })
    }

    const baseUrl = process.env.UNIPILE_API_URL
    const token = process.env.UNIPILE_ACCESS_TOKEN

    if (!baseUrl || !token) {
      return NextResponse.json({ error: "Unipile not configured" }, { status: 500 })
    }

    // Build the request body for sending invitation
    // account_id must be in the body per Unipile API docs
    const inviteBody: {
      provider_id: string
      account_id: string
      message?: string
    } = {
      provider_id: profileId,
      account_id: unipileAccountId,
    }

    // Add optional message (LinkedIn allows up to 300 chars for connection request notes)
    if (message && message.trim()) {
      inviteBody.message = message.trim().substring(0, 300)
    }

    // Send connection invitation using Unipile API
    const inviteResponse = await fetch(
      `${baseUrl}/api/v1/users/invite`,
      {
        method: "POST",
        headers: {
          "X-API-KEY": token,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(inviteBody),
      }
    )

    if (!inviteResponse.ok) {
      const errorData = await inviteResponse.text()
      console.error("Invite error response:", errorData)

      // Try to parse error for specific messages
      try {
        const errorJson = JSON.parse(errorData)
        if (errorJson.message?.includes("already connected")) {
          return NextResponse.json({ error: "Already connected with this person" }, { status: 400 })
        }
        if (errorJson.message?.includes("pending")) {
          return NextResponse.json({ error: "Connection request already pending" }, { status: 400 })
        }
        return NextResponse.json({ error: errorJson.message || "Failed to send connection request" }, { status: inviteResponse.status })
      } catch {
        return NextResponse.json({ error: "Failed to send connection request" }, { status: inviteResponse.status })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Invite error:", error)
    return NextResponse.json({ error: "Failed to send connection request" }, { status: 500 })
  }
}
