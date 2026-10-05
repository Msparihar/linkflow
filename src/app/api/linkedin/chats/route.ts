import { NextRequest, NextResponse } from "next/server"
import { requireLinkedin, unipileError } from "@/lib/session"

type Attendee = {
  id: string
  name: string
  profile_picture_url?: string
  is_me?: boolean
}

export async function GET(request: NextRequest) {
  const session = await requireLinkedin()
  if (session instanceof NextResponse) return session
  const { accountId: unipileAccountId } = session

  const baseUrl = process.env.UNIPILE_API_URL
  const token = process.env.UNIPILE_ACCESS_TOKEN

  if (!baseUrl || !token) {
    return NextResponse.json({ error: "Unipile not configured" }, { status: 500 })
  }

  const searchParams = request.nextUrl.searchParams
  const cursor = searchParams.get("cursor")
  const limit = parseInt(searchParams.get("limit") || "10", 10)
  const headers = { "X-API-KEY": token, Accept: "application/json" }

  try {
    let url = `${baseUrl}/api/v1/chats?account_id=${unipileAccountId}&limit=${limit}`
    if (cursor) {
      url += `&cursor=${cursor}`
    }

    const chatsResponse = await fetch(url, { method: "GET", headers })

    if (!chatsResponse.ok) {
      const errorText = await chatsResponse.text()
      console.error("Chats fetch error:", errorText)
      return unipileError(unipileAccountId, errorText, "Couldn't load your conversations. Try again.", chatsResponse.status)
    }

    const data = await chatsResponse.json()
    const chatItems = (data.items || []) as Array<Record<string, unknown>>

    const chats = await Promise.all(
      chatItems.map(async (chat) => {
        const chatId = String(chat.id)
        const [attendees, lastMessage] = await Promise.all([
          fetchAttendees(baseUrl, headers, chatId),
          fetchLastMessage(baseUrl, headers, chatId),
        ])
        const other = attendees.find((a) => !a.is_me)

        return {
          id: chatId,
          name: (chat.name as string | null) || other?.name || null,
          lastMessage: lastMessage?.text || "",
          lastMessageAt: lastMessage?.timestamp || chat.timestamp,
          unreadCount: chat.unread_count,
          attendees,
          profilePicture: other?.profile_picture_url,
        }
      })
    )

    return NextResponse.json({ chats, cursor: data.cursor })
  } catch (error) {
    console.error("Chats fetch error:", error)
    return NextResponse.json({ error: "Couldn't load your conversations. Try again." }, { status: 500 })
  }
}

async function fetchAttendees(
  baseUrl: string,
  headers: Record<string, string>,
  chatId: string
): Promise<Attendee[]> {
  try {
    const res = await fetch(`${baseUrl}/api/v1/chats/${chatId}/attendees`, { headers })
    if (!res.ok) return []
    const data = await res.json()
    return ((data.items || []) as Array<Record<string, unknown>>).map((a) => ({
      id: String(a.provider_id),
      name: (a.name as string) || "LinkedIn member",
      profile_picture_url: (a.picture_url as string) || undefined,
      is_me: a.is_self === 1 || a.is_self === true,
    }))
  } catch (err) {
    console.error(`Failed to fetch attendees for chat ${chatId}:`, err)
    return []
  }
}

async function fetchLastMessage(
  baseUrl: string,
  headers: Record<string, string>,
  chatId: string
): Promise<{ text: string; timestamp?: string } | null> {
  try {
    const res = await fetch(`${baseUrl}/api/v1/chats/${chatId}/messages?limit=1`, { headers })
    if (!res.ok) return null
    const data = await res.json()
    const message = (data.items || [])[0] as Record<string, unknown> | undefined
    if (!message) return null

    const attachments = (message.attachments as unknown[]) || []
    const body = (message.text as string) || (attachments.length ? "Sent an attachment" : "")
    return {
      text: message.is_sender === 1 && body ? `You: ${body}` : body,
      timestamp: message.timestamp as string | undefined,
    }
  } catch (err) {
    console.error(`Failed to fetch last message for chat ${chatId}:`, err)
    return null
  }
}
