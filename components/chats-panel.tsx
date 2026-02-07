"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, MessageSquare, Send, ArrowLeft, Check, CheckCheck } from "lucide-react"
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
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading conversations...</p>
      </div>
    )
  }

  // Chat list view
  if (!selectedChat) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
          <p className="text-sm text-muted-foreground">
            {chats.length} conversation{chats.length !== 1 ? 's' : ''}
          </p>
        </div>

        {chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-1">No conversations yet</h3>
            <p className="text-muted-foreground text-center max-w-sm">
              Start messaging your connections to see your conversations here
            </p>
          </div>
        ) : (
          <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden divide-y divide-border">
            {chats.map((chat, index) => {
              const otherAttendee = chat.attendees?.find((a) => !a.is_me) || chat.attendees?.[0]
              return (
                <div
                  key={chat.id}
                  className={cn(
                    "flex items-center gap-4 p-4 hover:bg-muted/50 cursor-pointer transition-colors",
                    chat.unreadCount > 0 && "bg-accent/30"
                  )}
                  onClick={() => handleSelectChat(chat)}
                >
                  <div className="relative">
                    <Avatar className="w-12 h-12 ring-2 ring-transparent hover:ring-primary/50 transition-all">
                      <AvatarImage src={otherAttendee?.profile_picture_url} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {(chat.name || otherAttendee?.name || "?").charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    {chat.unreadCount > 0 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center">
                        {chat.unreadCount > 9 ? '9+' : chat.unreadCount}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className={cn(
                        "font-medium truncate",
                        chat.unreadCount > 0 && "font-semibold"
                      )}>
                        {chat.name || otherAttendee?.name || "Unknown"}
                      </h3>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {chat.lastMessageAt && formatTime(chat.lastMessageAt)}
                      </span>
                    </div>
                    <p className={cn(
                      "text-sm truncate mt-0.5",
                      chat.unreadCount > 0 ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {chat.lastMessage || "No messages"}
                    </p>
                  </div>
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
    <div className="flex flex-col h-[calc(100vh-6rem)] bg-card rounded-xl shadow-sm border border-border overflow-hidden">
      {/* Chat header */}
      <div className="flex items-center gap-3 p-4 border-b border-border bg-card">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBackToList}
          className="hover:bg-muted"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Avatar className="w-10 h-10 ring-2 ring-primary/20">
          <AvatarImage src={otherAttendee?.profile_picture_url} />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
            {(selectedChat.name || otherAttendee?.name || "?").charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">
            {selectedChat.name || otherAttendee?.name || "Unknown"}
          </h3>
          <p className="text-xs text-muted-foreground">LinkedIn Connection</p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4">
        {loadingMessages ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="py-4 space-y-3">
            {messages.map((msg, index) => {
              const showTimestamp = index === 0 ||
                new Date(msg.timestamp).getTime() - new Date(messages[index - 1].timestamp).getTime() > 300000

              return (
                <div key={msg.id}>
                  {showTimestamp && (
                    <div className="flex justify-center my-4">
                      <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                  )}
                  <div
                    className={cn(
                      "flex",
                      msg.isFromMe ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm",
                        msg.isFromMe
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-muted rounded-bl-md"
                      )}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                      <div className={cn(
                        "flex items-center justify-end gap-1 mt-1",
                        msg.isFromMe ? "text-primary-foreground/70" : "text-muted-foreground"
                      )}>
                        <span className="text-xs">
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </span>
                        {msg.isFromMe && (
                          <CheckCheck className="w-3.5 h-3.5" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Message input */}
      <div className="p-4 border-t border-border bg-card">
        <div className="flex gap-3 items-end">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
            className="flex-1 min-h-[44px] bg-muted border-0 focus-visible:ring-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={sending || !newMessage.trim()}
            size="icon"
            className={cn(
              "h-11 w-11 rounded-full shadow-md transition-all",
              newMessage.trim() ? "bg-primary hover:bg-primary-hover" : "bg-muted text-muted-foreground"
            )}
          >
            {sending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
