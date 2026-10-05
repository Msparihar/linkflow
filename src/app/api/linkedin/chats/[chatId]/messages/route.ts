import { NextRequest, NextResponse } from "next/server"
import { getUnipileClient } from "@/lib/unipile"
import { requireLinkedin, unipileError } from "@/lib/session"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const session = await requireLinkedin()
  if (session instanceof NextResponse) return session
  const { accountId: unipileAccountId } = session
  const { chatId } = await params

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
    return unipileError(unipileAccountId, (error as { body?: unknown })?.body, "Couldn't load this conversation. Try again.")
  }
}
