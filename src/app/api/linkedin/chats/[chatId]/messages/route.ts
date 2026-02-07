import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getUnipileClient } from "@/lib/unipile"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const cookieStore = await cookies()
  const userId = cookieStore.get("user_id")?.value
  const unipileAccountId = cookieStore.get("unipile_account_id")?.value
  const { chatId } = await params

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  if (!unipileAccountId) {
    return NextResponse.json({ error: "LinkedIn not connected" }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const cursor = searchParams.get("cursor")
  const limit = parseInt(searchParams.get("limit") || "50", 10)

  try {
    const client = getUnipileClient()

    const params: { chat_id: string; limit: number; cursor?: string } = {
      chat_id: chatId,
      limit,
    }
    if (cursor) {
      params.cursor = cursor
    }

    const messagesResponse = await client.messaging.getAllMessagesFromChat(params)

    const messages = messagesResponse.items?.map((msg: Record<string, unknown>) => ({
      id: msg.id,
      text: msg.text,
      senderId: msg.sender_id,
      senderName: msg.sender_name,
      timestamp: msg.timestamp,
      isFromMe: msg.is_sender === 1 || msg.is_from_me === true,
    })) || []

    return NextResponse.json({
      messages,
      cursor: messagesResponse.cursor,
    })
  } catch (error) {
    console.error("Messages fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
