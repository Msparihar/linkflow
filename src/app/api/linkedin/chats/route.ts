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

  const baseUrl = process.env.UNIPILE_API_URL
  const token = process.env.UNIPILE_ACCESS_TOKEN

  if (!baseUrl || !token) {
    return NextResponse.json({ error: "Unipile not configured" }, { status: 500 })
  }

  const searchParams = request.nextUrl.searchParams
  const cursor = searchParams.get("cursor")
  const limit = parseInt(searchParams.get("limit") || "10", 10)

  try {
    let url = `${baseUrl}/api/v1/chats?account_id=${unipileAccountId}&limit=${limit}`
    if (cursor) {
      url += `&cursor=${cursor}`
    }

    const chatsResponse = await fetch(url, {
      method: "GET",
      headers: {
        "X-API-KEY": token,
        "Accept": "application/json",
      },
    })

    if (!chatsResponse.ok) {
      const errorText = await chatsResponse.text()
      console.error("Chats fetch error:", errorText)
      return NextResponse.json({ error: "Failed to fetch chats" }, { status: chatsResponse.status })
    }

    const data = await chatsResponse.json()
    const chatItems = data.items || []

    const chatsWithDetails: Array<Record<string, unknown>> = []

    for (const chat of chatItems as Array<Record<string, unknown>>) {
      const resolved = await resolveAttendee(chat, unipileAccountId, baseUrl, token)

      chatsWithDetails.push({
        id: String(chat.id),
        name: resolved.displayName,
        lastMessage: chat.last_message_text,
        lastMessageAt: chat.last_message_timestamp,
        unreadCount: chat.unread_count,
        attendees: resolved.attendees,
        profilePicture: resolved.profilePicture,
      })
    }

    return NextResponse.json({
      chats: chatsWithDetails,
      cursor: data.cursor,
    })
  } catch (error) {
    console.error("Chats fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function resolveAttendee(
  chat: Record<string, unknown>,
  accountId: string,
  baseUrl: string,
  token: string
) {
  let displayName = chat.name as string | null
  let attendees: Array<{
    id: string
    name: string
    profile_picture_url?: string
    is_me?: boolean
  }> = []
  let profilePicture: string | undefined

  // 1. Check chat.attendees first (already in memory, zero API calls)
  const chatAttendees = (chat.attendees as Array<Record<string, unknown>>) || []
  const otherAttendee = chatAttendees.find((a) => !a.is_me)

  if (otherAttendee?.provider_id) {
    const otherId = otherAttendee.provider_id as string

    // Fetch full profile for name + picture
    try {
      const userResponse = await fetch(
        `${baseUrl}/api/v1/users/${otherId}?account_id=${accountId}`,
        {
          method: "GET",
          headers: { "X-API-KEY": token, "Accept": "application/json" },
        }
      )

      if (userResponse.ok) {
        const userData = await userResponse.json()
        const firstName = userData.first_name || ""
        const lastName = userData.last_name || ""
        displayName = `${firstName} ${lastName}`.trim() || userData.name || null
        profilePicture = userData.profile_picture_url

        attendees = [
          {
            id: otherId,
            name: displayName || "Unknown",
            profile_picture_url: profilePicture,
            is_me: false,
          },
        ]

        return { displayName, attendees, profilePicture }
      }
    } catch (err) {
      console.error(`Failed to fetch user ${otherId}:`, err)
    }
  }

  // 2. Fallback: fetch messages to find the other person's sender_id
  try {
    const messagesUrl = `${baseUrl}/api/v1/chats/${chat.id}/messages?limit=10`
    const messagesResponse = await fetch(messagesUrl, {
      method: "GET",
      headers: { "X-API-KEY": token, "Accept": "application/json" },
    })

    if (messagesResponse.ok) {
      const messagesData = await messagesResponse.json()
      const otherPersonMessage = messagesData.items?.find(
        (msg: Record<string, unknown>) => msg.is_sender === 0
      )

      if (otherPersonMessage?.sender_id) {
        const otherPersonId = otherPersonMessage.sender_id as string

        try {
          const userResponse = await fetch(
            `${baseUrl}/api/v1/users/${otherPersonId}?account_id=${accountId}`,
            {
              method: "GET",
              headers: { "X-API-KEY": token, "Accept": "application/json" },
            }
          )

          if (userResponse.ok) {
            const userData = await userResponse.json()
            const firstName = userData.first_name || ""
            const lastName = userData.last_name || ""
            displayName = `${firstName} ${lastName}`.trim() || userData.name || null
            profilePicture = userData.profile_picture_url

            attendees = [
              {
                id: otherPersonId,
                name: displayName || "Unknown",
                profile_picture_url: profilePicture,
                is_me: false,
              },
            ]
          }
        } catch (err) {
          console.error(`Failed to fetch user ${otherPersonId}:`, err)
        }
      }
    }
  } catch (err) {
    console.error(`Failed to fetch messages for chat ${chat.id}:`, err)
  }

  return { displayName, attendees, profilePicture }
}
