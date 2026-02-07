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
  const limit = parseInt(searchParams.get("limit") || "20", 10)

  try {
    // Build URL with query params
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

    // Fetch sender info from messages for each chat
    const chatsWithDetails = await Promise.all(
      (data.items || []).map(async (chat: Record<string, unknown>) => {
        let displayName = chat.name as string | null
        let attendees: Array<{id: string, name: string, profile_picture_url?: string, is_me?: boolean}> = []
        let profilePicture: string | undefined

        // Get messages to find the other person's info
        try {
          const messagesUrl = `${baseUrl}/api/v1/chats/${chat.id}/messages?limit=10`

          const messagesResponse = await fetch(
            messagesUrl,
            {
              method: "GET",
              headers: {
                "X-API-KEY": token,
                "Accept": "application/json",
              },
            }
          )

          if (messagesResponse.ok) {
            const messagesData = await messagesResponse.json()

            // Find a message from the other person (is_sender: 0 means not from me)
            const otherPersonMessage = messagesData.items?.find(
              (msg: Record<string, unknown>) => msg.is_sender === 0
            )

            // Get the other person's ID - either from their message or from chat attendee info
            let otherPersonId: string | null = null

            if (otherPersonMessage && otherPersonMessage.sender_id) {
              otherPersonId = otherPersonMessage.sender_id as string
            } else {
              // If I sent all messages, we need to get the other attendee
              // First check if the chat object from list API has attendees
              const chatAttendees = chat.attendees as Array<Record<string, unknown>> || []
              const otherFromChat = chatAttendees.find((a: Record<string, unknown>) => !a.is_me)

              if (otherFromChat && otherFromChat.provider_id) {
                otherPersonId = otherFromChat.provider_id as string
              } else {
                // Try to get chat details
                try {
                  const chatDetailResponse = await fetch(
                    `${baseUrl}/api/v1/chats/${chat.id}`,
                    {
                      method: "GET",
                      headers: {
                        "X-API-KEY": token,
                        "Accept": "application/json",
                      },
                    }
                  )
                  if (chatDetailResponse.ok) {
                    const chatDetail = await chatDetailResponse.json()

                    // Use attendee_provider_id - this is the other person's LinkedIn ID
                    if (chatDetail.attendee_provider_id) {
                      otherPersonId = chatDetail.attendee_provider_id as string
                    } else {
                      // Fallback: Find attendee that is not me
                      const detailAttendees = chatDetail.attendees as Array<Record<string, unknown>> || []
                      const otherAttendee = detailAttendees.find((a: Record<string, unknown>) => !a.is_me)
                      if (otherAttendee && otherAttendee.provider_id) {
                        otherPersonId = otherAttendee.provider_id as string
                      }
                    }

                    // Also check if chat detail has name directly
                    if (!displayName && chatDetail.name) {
                      displayName = chatDetail.name as string
                    }
                  }
                } catch (err) {
                  console.error(`Failed to fetch chat detail ${chat.id}:`, err)
                }
              }
            }

            // Now fetch the user profile if we have an ID
            if (otherPersonId) {
              try {
                const userResponse = await fetch(
                  `${baseUrl}/api/v1/users/${otherPersonId}?account_id=${unipileAccountId}`,
                  {
                    method: "GET",
                    headers: {
                      "X-API-KEY": token,
                      "Accept": "application/json",
                    },
                  }
                )

                if (userResponse.ok) {
                  const userData = await userResponse.json()
                  const firstName = userData.first_name || ''
                  const lastName = userData.last_name || ''
                  displayName = `${firstName} ${lastName}`.trim() || userData.name || null
                  profilePicture = userData.profile_picture_url

                  attendees = [{
                    id: otherPersonId,
                    name: displayName || 'Unknown',
                    profile_picture_url: profilePicture,
                    is_me: false,
                  }]
                }
              } catch (err) {
                console.error(`Failed to fetch user ${otherPersonId}:`, err)
              }
            }
          }
        } catch (err) {
          console.error(`Failed to fetch messages for chat ${chat.id}:`, err)
        }

        return {
          id: chat.id,
          name: displayName,
          lastMessage: chat.last_message_text,
          lastMessageAt: chat.last_message_timestamp,
          unreadCount: chat.unread_count,
          attendees,
          profilePicture,
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
