"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Send, Loader2, CheckCircle, AlertCircle, FileText, ChevronDown, ChevronUp } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

interface Connection {
  id: string
  firstName: string
  lastName: string
  headline: string
  profilePicture: string
}

interface Template {
  id: string
  name: string
  content: string
}

interface ConnectionMessageDialogProps {
  connection: Connection | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ConnectionMessageDialog({ connection, open, onOpenChange }: ConnectionMessageDialogProps) {
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")
  const [templates, setTemplates] = useState<Template[]>([])
  const [showTemplates, setShowTemplates] = useState(false)

  useEffect(() => {
    if (open) {
      fetchTemplates()
    }
  }, [open])

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/templates")
      if (res.ok) {
        const data = await res.json()
        setTemplates(data.templates || [])
      }
    } catch (error) {
      console.error("Failed to fetch templates:", error)
    }
  }

  const handleSend = async () => {
    if (!message.trim() || !connection) return

    setSending(true)
    setStatus("idle")
    setErrorMessage("")

    try {
      const res = await fetch("/api/linkedin/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientId: connection.id,
          message: message.trim(),
        }),
      })

      if (res.ok) {
        setStatus("success")
        setMessage("")
        setTimeout(() => {
          onOpenChange(false)
          setStatus("idle")
        }, 2000)
      } else {
        const data = await res.json()
        setStatus("error")
        setErrorMessage(data.error || "Failed to send message")
      }
    } catch {
      setStatus("error")
      setErrorMessage("Network error. Please try again.")
    } finally {
      setSending(false)
    }
  }

  const handleClose = () => {
    setMessage("")
    setStatus("idle")
    setErrorMessage("")
    setShowTemplates(false)
    onOpenChange(false)
  }

  // Character count with color warnings
  const charCount = message.length
  const getCharCountColor = () => {
    if (charCount > 1000) return "text-destructive font-medium"
    if (charCount > 900) return "text-yellow-600"
    if (charCount > 800) return "text-yellow-500"
    return "text-muted-foreground"
  }

  if (!connection) return null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage
                src={connection.profilePicture || "/placeholder.svg"}
                alt={`${connection.firstName} ${connection.lastName}`}
              />
              <AvatarFallback className="bg-primary/10 text-primary">
                {connection.firstName.charAt(0)}
                {connection.lastName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <span className="text-foreground">
                {connection.firstName} {connection.lastName}
              </span>
              <p className="text-sm font-normal text-muted-foreground truncate max-w-[280px]">{connection.headline}</p>
            </div>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Send a message to {connection.firstName} {connection.lastName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {status === "success" && (
            <Alert className="bg-green-50 border-green-200 text-green-800">
              <CheckCircle className="w-4 h-4" />
              <AlertDescription>Message sent successfully!</AlertDescription>
            </Alert>
          )}

          {status === "error" && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {/* Templates section */}
          {templates.length > 0 && status !== "success" && (
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTemplates(!showTemplates)}
                className="text-muted-foreground p-0 h-auto hover:bg-transparent"
              >
                <FileText className="w-4 h-4 mr-2" />
                Use Template
                {showTemplates ? (
                  <ChevronUp className="w-4 h-4 ml-1" />
                ) : (
                  <ChevronDown className="w-4 h-4 ml-1" />
                )}
              </Button>

              {showTemplates && (
                <div className="mt-2 border rounded-md max-h-40 overflow-y-auto">
                  {templates.map((t) => (
                    <button
                      key={t.id}
                      className="w-full text-left p-3 hover:bg-muted transition-colors border-b last:border-b-0"
                      onClick={() => {
                        setMessage(t.content)
                        setShowTemplates(false)
                      }}
                    >
                      <p className="font-medium text-sm">{t.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {t.content}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <Textarea
            placeholder="Write your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className={cn(
              "min-h-[150px] resize-none",
              charCount > 1000 && "border-destructive focus-visible:ring-destructive"
            )}
            disabled={sending || status === "success"}
          />

          <div className="flex items-center justify-between">
            <p className={cn("text-xs", getCharCountColor())}>
              {charCount} / 1000 characters
              {charCount > 1000 && " (exceeds limit)"}
              {charCount > 800 && charCount <= 900 && " (approaching limit)"}
              {charCount > 900 && charCount <= 1000 && " (near limit)"}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose} disabled={sending}>
                Cancel
              </Button>
              <Button
                onClick={handleSend}
                disabled={!message.trim() || sending || charCount > 1000 || status === "success"}
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Message
                  </>
                )}
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Messages are sent directly through LinkedIn. Ensure your message follows LinkedIn&apos;s professional
            guidelines.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
