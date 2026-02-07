import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import {
  getCachedChatAttendees,
  setCachedChatAttendee,
  setCachedProfile,
} from "@/lib/cache"

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
  const limit = parseInt(searchParams.get("limit") || "20", 10)

  try {
    // 1. Fetch chat list from Unipile (always live for fresh unread counts)
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

    // 2. Bulk fetch cached attendees for all chat IDs
    const chatIds = chatItems.map((c: Record<string, unknown>) => String(c.id))
    const cachedAttendees = await getCachedChatAttendees(unipileAccountId, chatIds)

    // 3. Resolve each chat — from cache or via API
    const chatsWithDetails = await Promise.all(
      chatItems.map(async (chat: Record<string, unknown>) => {
        const chatId = String(chat.id)
        const cached = cachedAttendees[chatId]

        if (cached) {
          // Cache HIT — no API calls needed
          return {
            id: chatId,
            name: cached.name,
            lastMessage: chat.last_message_text,
            lastMessageAt: chat.last_message_timestamp,
            unreadCount: chat.unread_count,
            attendees: cached.attendees,
            profilePicture: cached.profilePicture,
          }
        }

        // Cache MISS — resolve attendee (existing logic) then cache
        const resolved = await resolveAttendee(chat, unipileAccountId, baseUrl, token)

        // Cache the result for next time (fire and forget)
        setCachedChatAttendee(unipileAccountId, chatId, {
          name: resolved.displayName,
          profilePicture: resolved.profilePicture,
          attendees: resolved.attendees,
        }).catch((err) => console.error(`Failed to cache attendee for chat ${chatId}:`, err))

        return {
          id: chatId,
          name: resolved.displayName,
          lastMessage: chat.last_message_text,
          lastMessageAt: chat.last_message_timestamp,
          unreadCount: chat.unread_count,
          attendees: resolved.attendees,
          profilePicture: resolved.profilePicture,
        }
      })
    )

    return NextResponse.json({
      chats: chatsWithDetails,
      cursor: data.cursor,
    })
  } catch (error) {
    console.error("Chats fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Resolve attendee info for a chat (the original N+1 logic, extracted)
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

      let otherPersonId: string | null = null

      if (otherPersonMessage?.sender_id) {
        otherPersonId = otherPersonMessage.sender_id as string
      } else {
        const chatAttendees =
          (chat.attendees as Array<Record<string, unknown>>) || []
        const otherFromChat = chatAttendees.find(
          (a: Record<string, unknown>) => !a.is_me
        )

        if (otherFromChat?.provider_id) {
          otherPersonId = otherFromChat.provider_id as string
        } else {
          try {
            const chatDetailResponse = await fetch(
              `${baseUrl}/api/v1/chats/${chat.id}`,
              {
                method: "GET",
                headers: { "X-API-KEY": token, "Accept": "application/json" },
              }
            )
            if (chatDetailResponse.ok) {
              const chatDetail = await chatDetailResponse.json()
              if (chatDetail.attendee_provider_id) {
                otherPersonId = chatDetail.attendee_provider_id as string
              } else {
                const detailAttendees =
                  (chatDetail.attendees as Array<Record<string, unknown>>) || []
                const otherAttendee = detailAttendees.find(
                  (a: Record<string, unknown>) => !a.is_me
                )
                if (otherAttendee?.provider_id) {
                  otherPersonId = otherAttendee.provider_id as string
                }
              }
              if (!displayName && chatDetail.name) {
                displayName = chatDetail.name as string
              }
            }
          } catch (err) {
            console.error(`Failed to fetch chat detail ${chat.id}:`, err)
          }
        }
      }

      if (otherPersonId) {
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
            displayName =
              `${firstName} ${lastName}`.trim() || userData.name || null
            profilePicture = userData.profile_picture_url

            attendees = [
              {
                id: otherPersonId,
                name: displayName || "Unknown",
                profile_picture_url: profilePicture,
                is_me: false,
              },
            ]

            // Also cache this profile for profile lookups
            setCachedProfile(accountId, otherPersonId, {
              id: userData.provider_id,
              providerId: userData.provider_id,
              publicIdentifier: userData.public_identifier,
              firstName,
              lastName,
              headline: userData.headline || "",
              profilePicture: userData.profile_picture_url || "",
              location: userData.location || "",
            }).catch(() => {})
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
