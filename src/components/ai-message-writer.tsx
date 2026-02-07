"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Loader2, Sparkles, CornerDownLeft, RotateCcw, Check, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  text: string
  senderId: string
  senderName: string
  timestamp: string
  isFromMe: boolean
}

interface AiMessageWriterProps {
  messages: Message[]
  contactName: string
  onInsert: (text: string) => void
}

const QUICK_PROMPTS = [
  { label: "Say thanks", prompt: "Thank them warmly" },
  { label: "Follow up", prompt: "Send a friendly follow-up" },
  { label: "Schedule a call", prompt: "Ask to schedule a call this week" },
  { label: "Introduce myself", prompt: "Introduce myself professionally" },
]

export function AiMessageWriter({ messages, contactName, onInsert }: AiMessageWriterProps) {
  const [open, setOpen] = useState(false)
  const [prompt, setPrompt] = useState("")
  const [generatedText, setGeneratedText] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 100)
    } else {
      // Reset state when closed
      setPrompt("")
      setGeneratedText("")
      setError("")
      setLoading(false)
    }
  }, [open])

  const generate = async (customPrompt?: string) => {
    const activePrompt = customPrompt || prompt
    if (!activePrompt.trim()) return

    setLoading(true)
    setError("")
    setGeneratedText("")

    try {
      const res = await fetch("/api/ai/generate-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: activePrompt,
          messages,
          contactName,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Something went wrong")
        return
      }

      setGeneratedText(data.message)
    } catch {
      setError("Failed to connect. Check your network.")
    } finally {
      setLoading(false)
    }
  }

  const handleInsert = () => {
    onInsert(generatedText)
    setOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (generatedText) {
        handleInsert()
      } else {
        generate()
      }
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-11 w-11 rounded-full transition-all",
                open
                  ? "bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400"
                  : "text-muted-foreground hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-500/10 dark:hover:text-violet-400"
              )}
            >
              <Sparkles className="w-5 h-5" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="top">Write with AI</TooltipContent>
      </Tooltip>

      <PopoverContent
        side="top"
        align="start"
        sideOffset={12}
        className="w-[400px] p-0 rounded-xl shadow-xl border border-border/50 bg-popover overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-gradient-to-r from-violet-500/5 to-purple-500/5">
          <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-violet-100 dark:bg-violet-500/20">
            <Sparkles className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
          </div>
          <span className="text-sm font-medium">AI Message Writer</span>
          {contactName && (
            <span className="text-xs text-muted-foreground ml-auto">
              Replying to {contactName}
            </span>
          )}
        </div>

        <div className="p-3 space-y-3">
          {/* Quick prompts */}
          {!generatedText && !loading && (
            <div className="flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map((qp) => (
                <button
                  key={qp.label}
                  onClick={() => {
                    setPrompt(qp.prompt)
                    generate(qp.prompt)
                  }}
                  className="text-xs px-2.5 py-1.5 rounded-full border border-border/60 bg-muted/50 text-muted-foreground hover:bg-violet-50 hover:text-violet-700 hover:border-violet-200 dark:hover:bg-violet-500/10 dark:hover:text-violet-400 dark:hover:border-violet-500/30 transition-colors"
                >
                  {qp.label}
                </button>
              ))}
            </div>
          )}

          {/* Prompt input */}
          {!generatedText && (
            <div className="relative">
              <Textarea
                ref={textareaRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. Thank them and ask about the role..."
                disabled={loading}
                className="min-h-[72px] max-h-[120px] resize-none border-border/60 bg-muted/30 text-sm pr-10 focus-visible:ring-violet-500/30 focus-visible:border-violet-400"
              />
              {!loading && prompt.trim() && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => generate()}
                      className="absolute bottom-2.5 right-2.5 p-1 rounded-md text-muted-foreground hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors"
                    >
                      <CornerDownLeft className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="left">Generate</TooltipContent>
                </Tooltip>
              )}
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="flex items-center gap-3 py-4 justify-center">
              <div className="relative">
                <Loader2 className="w-5 h-5 animate-spin text-violet-500" />
              </div>
              <span className="text-sm text-muted-foreground animate-pulse">
                Writing your message...
              </span>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <X className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
              <div>
                <p className="text-sm text-destructive">{error}</p>
                <button
                  onClick={() => generate()}
                  className="text-xs text-destructive/80 hover:text-destructive underline mt-1"
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          {/* Generated result */}
          {generatedText && !loading && (
            <div className="space-y-3">
              <div className="relative p-3 rounded-lg bg-muted/40 border border-border/50">
                <p className="text-sm leading-relaxed whitespace-pre-wrap pr-1">
                  {generatedText}
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleInsert}
                  size="sm"
                  className="flex-1 h-9 bg-violet-600 hover:bg-violet-700 text-white rounded-lg gap-1.5 shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" />
                  Use this message
                </Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 rounded-lg border-border/60"
                      onClick={() => generate()}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Regenerate</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 rounded-lg border-border/60"
                      onClick={() => {
                        setGeneratedText("")
                        setPrompt("")
                        setTimeout(() => textareaRef.current?.focus(), 50)
                      }}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Start over</TooltipContent>
                </Tooltip>
              </div>
            </div>
          )}
        </div>

        {/* Footer hint */}
        {!generatedText && !loading && (
          <div className="px-4 py-2 border-t border-border/30 bg-muted/20">
            <p className="text-[11px] text-muted-foreground/70 text-center">
              Press <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono border border-border/50">Enter</kbd> to generate
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
