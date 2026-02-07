"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Linkedin,
  Users,
  MessageSquare,
  Zap,
  FileText,
  ArrowRight,
  Sparkles,
  Search,
  Send,
  ArrowLeft,
  Check,
} from "lucide-react"
import { useInView } from "@/hooks/use-in-view"

/* ------------------------------------------------------------------ */
/*  Dashboard Mockup (from V5)                                         */
/* ------------------------------------------------------------------ */
function DashboardMockup() {
  const messages = [
    { type: "sent", text: "Hi Sarah! I loved your talk on product strategy." },
    { type: "received", text: "Thanks so much! Always happy to connect." },
    { type: "sent", text: "Would you be open to a quick chat this week?" },
    { type: "received", text: "Absolutely, let's set something up!" },
  ]

  return (
    <div className="bg-card rounded-2xl border border-border shadow-[var(--shadow-xl)] overflow-hidden w-full max-w-md mx-auto">
      {/* Title bar */}
      <div className="h-10 bg-muted/50 border-b border-border flex items-center px-4 gap-2">
        <div className="w-3 h-3 rounded-full bg-red-400" />
        <div className="w-3 h-3 rounded-full bg-yellow-400" />
        <div className="w-3 h-3 rounded-full bg-green-400" />
        <span className="ml-3 text-[11px] text-muted-foreground font-medium">
          LinkedIn Connect
        </span>
      </div>

      {/* Body */}
      <div className="flex h-80">
        {/* Mini sidebar */}
        <div className="w-12 bg-muted/30 border-r border-border flex flex-col items-center gap-3 pt-4 shrink-0">
          <div className="w-6 h-6 rounded-md bg-primary/20" />
          <div className="w-6 h-6 rounded-md bg-muted" />
          <div className="w-6 h-6 rounded-md bg-muted" />
          <div className="w-6 h-6 rounded-md bg-muted" />
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col p-3 gap-2 overflow-hidden">
          {/* Chat header */}
          <div className="flex items-center gap-2 pb-2 border-b border-border mb-1">
            <img src="https://i.pravatar.cc/24?img=47" alt="Sarah Chen" className="w-6 h-6 rounded-full object-cover" />
            <span className="text-xs font-medium text-foreground">
              Sarah Chen
            </span>
            <span className="ml-auto text-[10px] text-green-500">online</span>
          </div>

          {/* Messages */}
          <div className="flex-1 flex flex-col justify-end gap-1.5">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`animate-message-send opacity-0 flex items-end gap-1.5 ${
                  msg.type === "sent" ? "flex-row-reverse" : ""
                }`}
                style={{ animationDelay: `${i * 0.8}s`, animationFillMode: "forwards" }}
              >
                <img
                  src={msg.type === "sent" ? "https://i.pravatar.cc/20?img=12" : "https://i.pravatar.cc/20?img=47"}
                  alt=""
                  className="w-5 h-5 rounded-full object-cover shrink-0"
                />
                <div
                  className={`${
                    msg.type === "sent"
                      ? "bg-primary text-primary-foreground rounded-2xl rounded-br-sm"
                      : "bg-muted rounded-2xl rounded-bl-sm"
                  } px-3 py-1.5 text-xs max-w-[70%]`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          {/* Typing indicator */}
          <div className="mr-auto flex items-end gap-1.5 animate-message-send opacity-0" style={{ animationDelay: "3.4s", animationFillMode: "forwards" }}>
            <img src="https://i.pravatar.cc/20?img=47" alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
            <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2 flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-pulse" />
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-pulse" style={{ animationDelay: "0.2s" }} />
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-pulse" style={{ animationDelay: "0.4s" }} />
              <span className="text-[10px] text-muted-foreground ml-1">typing...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function BentoTile({
  children,
  className = "",
  delay = "stagger-1",
}: {
  children: React.ReactNode
  className?: string
  delay?: string
}) {
  const { ref, isInView } = useInView(0.15)
  return (
    <div
      ref={ref}
      className={`bg-card rounded-2xl border border-border p-6 md:p-8 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-shadow duration-300 ${
        isInView ? `animate-scale-fade-in ${delay}` : "opacity-0"
      } ${className}`}
    >
      {children}
    </div>
  )
}

export function LandingBento() {
  const { ref: ctaRef, isInView: ctaVisible } = useInView()

  /* Typing effect — delayed to start after fade-up animation (400ms) */
  const words = ["outreach", "messaging", "networking", "growth"]
  const [wordIndex, setWordIndex] = useState(0)
  const [text, setText] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const delay = setTimeout(() => setReady(true), 500)
    return () => clearTimeout(delay)
  }, [])

  useEffect(() => {
    if (!ready) return
    const currentWord = words[wordIndex]
    const timeout = setTimeout(
      () => {
        if (!isDeleting) {
          setText(currentWord.slice(0, text.length + 1))
          if (text === currentWord) {
            setTimeout(() => setIsDeleting(true), 1500)
          }
        } else {
          setText(currentWord.slice(0, text.length - 1))
          if (text === "") {
            setIsDeleting(false)
            setWordIndex((prev) => (prev + 1) % words.length)
          }
        }
      },
      isDeleting ? 50 : 100
    )
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, isDeleting, wordIndex, ready])

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold text-foreground">
            <Linkedin className="size-5 text-primary" />
            LinkedIn Connect
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
          </div>
          <Button asChild size="sm">
            <Link href="/login">Get Started</Link>
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-x-clip scroll-mt-20">
        <div className="absolute inset-0 bg-mesh opacity-40 pointer-events-none" />
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24 grid md:grid-cols-2 gap-12 items-center relative z-10">
          {/* Left column */}
          <div className="animate-fade-up">
            <Badge variant="secondary" className="mb-6 gap-1.5">
              <Sparkles className="size-3" />
              Smarter LinkedIn Outreach
            </Badge>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
              Streamline your
              <span className="block text-primary">
                {text}
                <span className="animate-cursor-blink">|</span>
              </span>
            </h1>

            <p className="text-lg text-muted-foreground max-w-md mb-8 leading-relaxed">
              Automate personalized messaging, manage connections, and build sequences
              that convert — all from one clean dashboard.
            </p>

            <div className="flex items-center gap-4 flex-wrap">
              <Button asChild size="lg">
                <Link href="/login">
                  Start for Free <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <a href="#features">See Features</a>
              </Button>
            </div>
          </div>

          {/* Right column — Animated Dashboard */}
          <div className="animate-slide-up-in stagger-2">
            <DashboardMockup />
          </div>
        </div>
      </section>

      {/* Bento Features Grid */}
      <section id="features" className="px-6 pb-20 scroll-mt-20">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 md:grid-rows-2 gap-4">
          {/* Messaging Tile — large, spans 2 cols */}
          <BentoTile className="md:col-span-2" delay="stagger-1">
            <div className="flex items-center gap-2 mb-5">
              <MessageSquare className="size-5 text-primary" />
              <h3 className="font-semibold text-foreground">Smart Messaging</h3>
            </div>
            <div className="bg-muted/40 rounded-xl p-4 space-y-3">
              <div className="flex justify-start">
                <div className="bg-muted text-foreground rounded-2xl rounded-bl-md px-4 py-2 text-sm max-w-[70%]">
                  Hey! I saw your talk on product-led growth — great insights.
                </div>
              </div>
              <div className="flex justify-end">
                <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-2 text-sm max-w-[70%]">
                  Thanks! Happy to chat more about it. Are you working on something similar?
                </div>
              </div>
              <div className="flex justify-start">
                <div className="bg-muted text-foreground rounded-2xl rounded-bl-md px-4 py-2 text-sm max-w-[70%]">
                  Yes — we just launched a self-serve onboarding flow.
                </div>
              </div>
              <div className="flex justify-start items-center gap-1 pl-1">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-pulse" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-pulse [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-pulse [animation-delay:300ms]" />
                <span className="text-xs text-muted-foreground ml-1">typing...</span>
              </div>
            </div>
          </BentoTile>

          {/* Connections Tile — tall, spans 2 rows */}
          <BentoTile className="md:row-span-2" delay="stagger-2">
            <div className="flex items-center gap-2 mb-5">
              <Users className="size-5 text-primary" />
              <h3 className="font-semibold text-foreground">Connections</h3>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 text-sm text-muted-foreground">
                <Search className="size-3.5" />
                <span>Search connections...</span>
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground mb-4">2,847 <span className="text-sm font-normal text-muted-foreground">connections</span></p>
            <div className="space-y-3">
              {[
                { initials: "SK", name: "Sarah Kim", role: "VP of Sales, Stripe" },
                { initials: "JD", name: "James Drake", role: "Founder, Acme Inc" },
                { initials: "ML", name: "Maria Lopez", role: "Head of Growth, Vercel" },
                { initials: "AP", name: "Alex Park", role: "CTO, Notion" },
                { initials: "RB", name: "Rachel Brown", role: "PM Lead, Linear" },
              ].map((c) => (
                <div key={c.initials} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium text-primary shrink-0">
                    {c.initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </BentoTile>

          {/* Sequences Tile — medium */}
          <BentoTile delay="stagger-3">
            <div className="flex items-center gap-2 mb-5">
              <Zap className="size-5 text-primary" />
              <h3 className="font-semibold text-foreground">Sequences</h3>
            </div>
            <div className="space-y-0">
              {[
                { day: "Day 1", label: "Connect", done: true },
                { day: "Day 3", label: "Follow up", done: true },
                { day: "Day 7", label: "Close", done: false },
              ].map((step, i) => (
                <div key={step.day} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full ${step.done ? "bg-primary" : "bg-border"} shrink-0 mt-0.5`} />
                    {i < 2 && <div className="w-0.5 h-8 bg-border" />}
                  </div>
                  <div className="pb-4">
                    <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                      {step.day}: {step.label}
                      {step.done && <Check className="size-3 text-primary" />}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {step.done ? "Completed" : "Pending"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </BentoTile>

          {/* Templates Tile — medium */}
          <BentoTile delay="stagger-4">
            <div className="flex items-center gap-2 mb-5">
              <FileText className="size-5 text-primary" />
              <h3 className="font-semibold text-foreground">Templates</h3>
            </div>
            <div className="bg-muted/40 rounded-xl p-4 font-mono text-sm leading-relaxed text-foreground">
              <p>
                Hi <span className="text-primary font-mono text-sm">{"{{firstName}}"}</span>,
              </p>
              <p className="mt-2">
                I noticed you&apos;re at{" "}
                <span className="text-primary font-mono text-sm">{"{{company}}"}</span> — I&apos;d love
                to connect about{" "}
                <span className="text-primary font-mono text-sm">{"{{topic}}"}</span>.
              </p>
              <p className="mt-2">Best,</p>
              <p>
                <span className="text-primary font-mono text-sm">{"{{senderName}}"}</span>
              </p>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <Send className="size-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">12 templates saved</span>
            </div>
          </BentoTile>
        </div>
      </section>

      {/* CTA Section */}
      <section ref={ctaRef} className="py-24 px-6 text-center scroll-mt-20">
        <div className={`max-w-2xl mx-auto ${ctaVisible ? "animate-fade-up" : "opacity-0"}`}>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">
            Ready to transform your outreach?
          </h2>
          <p className="text-muted-foreground mb-8">
            Join thousands of professionals who close more deals with LinkedIn Connect.
          </p>
          <Button asChild size="lg">
            <Link href="/login">
              Get Started Free <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Linkedin className="size-4 text-primary" />
            <span>LinkedIn Connect</span>
          </div>
          <p>&copy; {new Date().getFullYear()} LinkedIn Connect. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
