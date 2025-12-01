"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, MessageSquare, Send, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"

interface Chat {
  id: string
  name: string | null
  lastMessage: string
  lastMessageAt: string
  unreadCount: number
  attendees: Array<{
    id: string
    name: string
    profile_picture_url?: string
    is_me?: boolean
  }>
}

interface Message {
  id: string
  text: string
  senderId: string
  senderName: string
  timestamp: string
  isFromMe: boolean
}

export function ChatsPanel() {
  const [chats, setChats] = useState<Chat[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null)
  const [loadingChats, setLoadingChats] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [newMessage, setNewMessage] = useState("")
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    fetchChats()
  }, [])

  // Handle chat selection from URL query param
  useEffect(() => {
    const chatId = searchParams.get("chat")
    if (chatId && chats.length > 0 && !selectedChat) {
      const chat = chats.find(c => c.id === chatId)
      if (chat) {
        setSelectedChat(chat)
      }
    }
  }, [searchParams, chats, selectedChat])

  // Update URL when chat is selected
  const handleSelectChat = (chat: Chat) => {
    setSelectedChat(chat)
    router.push(`/dashboard/chats?chat=${chat.id}`, { scroll: false })
  }

  // Clear URL when going back to chat list
  const handleBackToList = () => {
    setSelectedChat(null)
    router.push("/dashboard/chats", { scroll: false })
  }

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat.id)
    }
  }, [selectedChat])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const fetchChats = async () => {
    try {
      const res = await fetch("/api/linkedin/chats?limit=50")
      if (res.ok) {
        const data = await res.json()
        setChats(data.chats || [])
      }
    } catch (error) {
      console.error("Failed to fetch chats:", error)
    } finally {
      setLoadingChats(false)
    }
  }

  const fetchMessages = async (chatId: string) => {
    setLoadingMessages(true)
    try {
      const res = await fetch(`/api/linkedin/chats/${chatId}/messages?limit=100`)
      if (res.ok) {
        const data = await res.json()
        setMessages((data.messages || []).reverse())
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error)
    } finally {
      setLoadingMessages(false)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return

    setSending(true)
    try {
      const res = await fetch("/api/linkedin/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: selectedChat.id,
          message: newMessage.trim(),
        }),
      })

      if (res.ok) {
        setNewMessage("")
        // Refresh messages
        fetchMessages(selectedChat.id)
      }
    } catch (error) {
      console.error("Failed to send message:", error)
    } finally {
      setSending(false)
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } else if (diffDays === 1) {
      return "Yesterday"
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: "short" })
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" })
  }

  if (loadingChats) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  // Chat list view
  if (!selectedChat) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Messages</h2>

        {chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              No conversations yet. Start messaging your connections!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {chats.map((chat) => {
              const otherAttendee = chat.attendees?.find((a) => !a.is_me) || chat.attendees?.[0]
              return (
                <div
                  key={chat.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                  onClick={() => handleSelectChat(chat)}
                >
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={otherAttendee?.profile_picture_url} />
                    <AvatarFallback>
                      {(chat.name || otherAttendee?.name || "?").charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium truncate">
                        {chat.name || otherAttendee?.name || "Unknown"}
                      </h3>
                      <span className="text-xs text-muted-foreground">
                        {chat.lastMessageAt && formatTime(chat.lastMessageAt)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {chat.lastMessage || "No messages"}
                    </p>
                  </div>
                  {chat.unreadCount > 0 && (
                    <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                      {chat.unreadCount}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // Chat detail view
  const otherAttendee = selectedChat.attendees?.find((a) => !a.is_me) || selectedChat.attendees?.[0]

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Chat header */}
      <div className="flex items-center gap-3 pb-4 border-b">
        <Button variant="ghost" size="icon" onClick={handleBackToList}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Avatar className="w-10 h-10">
          <AvatarImage src={otherAttendee?.profile_picture_url} />
          <AvatarFallback>
            {(selectedChat.name || otherAttendee?.name || "?").charAt(0)}
          </AvatarFallback>
        </Avatar>
        <h3 className="font-semibold">
          {selectedChat.name || otherAttendee?.name || "Unknown"}
        </h3>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 py-4">
        {loadingMessages ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex",
                  msg.isFromMe ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[70%] rounded-lg px-4 py-2",
                    msg.isFromMe
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  <p className="text-sm">{msg.text}</p>
                  <p
                    className={cn(
                      "text-xs mt-1",
                      msg.isFromMe ? "text-primary-foreground/70" : "text-muted-foreground"
                    )}
                  >
                    {formatTime(msg.timestamp)}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Message input */}
      <div className="flex gap-2 pt-4 border-t">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
        />
        <Button onClick={handleSendMessage} disabled={sending || !newMessage.trim()}>
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  )
}
