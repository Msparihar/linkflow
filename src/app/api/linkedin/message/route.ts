import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getUnipileClient } from "@/lib/unipile"

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const userId = cookieStore.get("user_id")?.value
  const unipileAccountId = cookieStore.get("unipile_account_id")?.value
  const accessToken = cookieStore.get("linkedin_access_token")?.value

  // Check for user session
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const { recipientId, message } = await request.json()

    if (!recipientId || !message) {
      return NextResponse.json({ error: "Recipient ID and message are required" }, { status: 400 })
    }

    if (message.length > 1000) {
      return NextResponse.json({ error: "Message exceeds maximum length of 1000 characters" }, { status: 400 })
    }

    // Try Unipile first
    if (unipileAccountId) {
      try {
        const client = getUnipileClient()

        // Start a new chat with the recipient (LinkedIn connections only, no InMail)
        const response = await client.messaging.startNewChat({
          account_id: unipileAccountId,
          attendees_ids: [recipientId],
          text: message,
          options: {
            linkedin: {
              api: 'classic',
              inmail: false,
            },
          },
        })

        return NextResponse.json({ success: true, chat_id: response.chat_id })
      } catch (error) {
        console.error("Unipile message send error:", error)
        return NextResponse.json({ error: "Failed to send message. Please try again." }, { status: 500 })
      }
    }

    // Legacy LinkedIn API fallback
    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // LinkedIn Messages API call
    const messageResponse = await fetch("https://api.linkedin.com/v2/messages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        recipients: [recipientId],
        subject: "New message",
        body: message,
      }),
    })

    if (!messageResponse.ok) {
      const errorData = await messageResponse.json().catch(() => ({}))
      console.error("Message send failed:", errorData)

      if (messageResponse.status === 403) {
        return NextResponse.json({ error: "You can only message first-degree connections" }, { status: 403 })
      }

      if (messageResponse.status === 429) {
        return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 })
      }

      return NextResponse.json({ error: "Failed to send message. Please try again." }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Message send error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
