"use client"

import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import {
  Send,
  Loader2,
  CheckCircle,
  AlertCircle,
  FileText,
  ChevronDown,
  ChevronUp
} from "lucide-react"
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

interface BulkMessageDialogProps {
  connections: Connection[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: () => void
}

type SendStatus = "pending" | "sending" | "success" | "error"

interface SendResult {
  connectionId: string
  status: SendStatus
  error?: string
}

export function BulkMessageDialog({
  connections,
  open,
  onOpenChange,
  onComplete
}: BulkMessageDialogProps) {
  const [message, setMessage] = useState("")
  const [showTemplates, setShowTemplates] = useState(false)
  const [results, setResults] = useState<SendResult[]>([])
  const [progress, setProgress] = useState(0)

  const { data: templates = [] } = useQuery({
    queryKey: ["templates"],
    queryFn: async () => {
      const res = await fetch("/api/templates")
      if (!res.ok) throw new Error("Failed to fetch templates")
      const data = await res.json()
      return (data.templates || []) as Template[]
    },
    enabled: open,
  })

  const bulkSendMutation = useMutation({
    mutationFn: async ({ connections, message }: { connections: Connection[]; message: string }) => {
      setResults(connections.map(c => ({ connectionId: c.id, status: "pending" as SendStatus })))

      for (let i = 0; i < connections.length; i++) {
        const connection = connections[i]

        setResults(prev =>
          prev.map(r =>
            r.connectionId === connection.id ? { ...r, status: "sending" as SendStatus } : r
          )
        )

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
            setResults(prev =>
              prev.map(r =>
                r.connectionId === connection.id ? { ...r, status: "success" as SendStatus } : r
              )
            )
          } else {
            const data = await res.json()
            setResults(prev =>
              prev.map(r =>
                r.connectionId === connection.id
                  ? { ...r, status: "error" as SendStatus, error: data.error }
                  : r
              )
            )
          }
        } catch {
          setResults(prev =>
            prev.map(r =>
              r.connectionId === connection.id
                ? { ...r, status: "error" as SendStatus, error: "Network error" }
                : r
            )
          )
        }

        setProgress(((i + 1) / connections.length) * 100)

        // Small delay between messages to avoid rate limiting
        if (i < connections.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
    },
  })

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setMessage("")
      setResults([])
      setProgress(0)
    }
    onOpenChange(isOpen)
  }

  const handleSend = () => {
    if (!message.trim() || connections.length === 0) return
    bulkSendMutation.mutate({ connections, message })
  }

  const getStatusIcon = (status: SendStatus) => {
    switch (status) {
      case "sending":
        return <Loader2 className="w-4 h-4 animate-spin text-primary" />
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case "error":
        return <AlertCircle className="w-4 h-4 text-destructive" />
      default:
        return <div className="w-4 h-4 rounded-full bg-muted" />
    }
  }

  const successCount = results.filter(r => r.status === "success").length
  const errorCount = results.filter(r => r.status === "error").length
  const isComplete = results.length > 0 && results.every(r => r.status === "success" || r.status === "error")

  // Character count warning colors
  const charCount = message.length
  const getCharCountColor = () => {
    if (charCount > 1000) return "text-destructive"
    if (charCount > 900) return "text-yellow-600"
    if (charCount > 800) return "text-yellow-500"
    return "text-muted-foreground"
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Send Message to {connections.length} Connection{connections.length !== 1 ? "s" : ""}
          </DialogTitle>
          <DialogDescription>
            The same message will be sent to all selected connections.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Recipients preview */}
          <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-lg max-h-32 overflow-y-auto">
            {connections.map((c) => {
              const result = results.find(r => r.connectionId === c.id)
              return (
                <div
                  key={c.id}
                  className="flex items-center gap-2 bg-background px-2 py-1 rounded-md"
                >
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={c.profilePicture} />
                    <AvatarFallback className="text-xs">
                      {c.firstName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{c.firstName}</span>
                  {result && getStatusIcon(result.status)}
                </div>
              )
            })}
          </div>

          {/* Templates section */}
          {templates.length > 0 && !bulkSendMutation.isPending && (
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTemplates(!showTemplates)}
                className="text-muted-foreground"
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
                <div className="mt-2 grid gap-2 max-h-40 overflow-y-auto">
                  {templates.map((t) => (
                    <button
                      key={t.id}
                      className="text-left p-2 rounded-md hover:bg-muted transition-colors"
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

          {/* Message input */}
          <div>
            <Textarea
              placeholder="Write your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[150px]"
              disabled={bulkSendMutation.isPending}
            />
            <p className={cn("text-xs mt-1", getCharCountColor())}>
              {charCount} / 1000 characters
              {charCount > 1000 && " (exceeds limit)"}
            </p>
          </div>

          {/* Progress bar */}
          {bulkSendMutation.isPending && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground text-center">
                Sending... {Math.round(progress)}%
              </p>
            </div>
          )}

          {/* Results summary */}
          {isComplete && (
            <div className="p-4 rounded-lg bg-muted">
              <p className="font-medium">
                Completed: {successCount} sent, {errorCount} failed
              </p>
              {errorCount > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  Some messages failed to send. You can try again later.
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            {isComplete ? (
              <Button onClick={onComplete}>Done</Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={bulkSendMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSend}
                  disabled={bulkSendMutation.isPending || !message.trim() || charCount > 1000}
                >
                  {bulkSendMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send to All
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
