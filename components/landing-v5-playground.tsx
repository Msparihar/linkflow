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
  ArrowLeft,
  Send,
} from "lucide-react"
import { useInView } from "@/hooks/use-in-view"

/* ------------------------------------------------------------------ */
/*  Animated Counter                                                   */
/* ------------------------------------------------------------------ */
function AnimatedCounter({
  target,
  suffix = "",
}: {
  target: number
  suffix?: string
}) {
  const { ref, isInView } = useInView()
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!isInView) return
    const duration = 2000
    const steps = 60
    const increment = target / steps
    let current = 0
    const timer = setInterval(() => {
      current += increment
      if (current >= target) {
        setCount(target)
        clearInterval(timer)
      } else {
        setCount(Math.floor(current))
      }
    }, duration / steps)
    return () => clearInterval(timer)
  }, [isInView, target])

  return (
    <span ref={ref} className="tabular-nums">
      {count.toLocaleString()}
      {suffix}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Dashboard Mockup                                                   */
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
      <div className="flex h-64">
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
            <div className="w-6 h-6 rounded-full bg-primary/30" />
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
                className={`animate-message-send opacity-0 ${
                  msg.type === "sent"
                    ? "ml-auto bg-primary text-primary-foreground rounded-2xl rounded-br-sm"
                    : "mr-auto bg-muted rounded-2xl rounded-bl-sm"
                } px-3 py-1.5 text-xs max-w-[70%]`}
                style={{ animationDelay: `${i * 0.8}s`, animationFillMode: "forwards" }}
              >
                {msg.text}
              </div>
            ))}
          </div>

          {/* Typing indicator */}
          <div className="mr-auto bg-muted rounded-2xl rounded-bl-sm px-3 py-2 flex items-center gap-1 animate-message-send opacity-0" style={{ animationDelay: "3.4s", animationFillMode: "forwards" }}>
            <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-pulse" />
            <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-pulse" style={{ animationDelay: "0.2s" }} />
            <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-pulse" style={{ animationDelay: "0.4s" }} />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Feature Card                                                       */
/* ------------------------------------------------------------------ */
function FeatureCard({
  icon: Icon,
  title,
  description,
  hoverClass,
}: {
  icon: React.ElementType
  title: string
  description: string
  hoverClass: string
}) {
  return (
    <div className="bg-card rounded-2xl border border-border p-8 group transition-all duration-300 hover:shadow-lg hover:border-primary/20 hover:-translate-y-1">
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
        <Icon
          className={`w-6 h-6 text-primary transition-transform duration-500 ${hoverClass}`}
        />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */
export function LandingPlayground() {
  /* Typing effect state */
  const words = ["outreach", "messaging", "networking", "growth"]
  const [wordIndex, setWordIndex] = useState(0)
  const [text, setText] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)

  /* Section in-view hooks */
  const statsView = useInView()
  const featuresView = useInView()
  const ctaView = useInView()

  useEffect(() => {
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
  }, [text, isDeleting, wordIndex])

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Navbar ─────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 glass border-b border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-16">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              All Designs
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Linkedin className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-foreground">
                LinkedIn Connect
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#stats" className="hover:text-foreground transition-colors">
              Stats
            </a>
            <a href="#cta" className="hover:text-foreground transition-colors">
              Pricing
            </a>
          </div>

          <Button asChild size="sm">
            <Link href="/login">
              Get Started <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-mesh opacity-40 pointer-events-none" />
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28 grid md:grid-cols-2 gap-12 items-center relative z-10">
          {/* Left column */}
          <div className="animate-fade-up">
            <Badge variant="secondary" className="mb-6 gap-1.5">
              <Sparkles className="w-3 h-3" />
              Interactive Playground
            </Badge>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
              Streamline your{" "}
              <span className="text-primary">
                {text}
                <span className="animate-cursor-blink">|</span>
              </span>
            </h1>

            <p className="text-lg text-muted-foreground max-w-md mb-8 leading-relaxed">
              Automate outreach, manage conversations, and build meaningful
              connections on LinkedIn — all from a single powerful dashboard.
            </p>

            <div className="flex items-center gap-4 flex-wrap">
              <Button asChild size="lg">
                <Link href="/login">
                  Start for Free <ArrowRight className="w-4 h-4" />
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

      {/* ── Stats Bar ──────────────────────────────────────────── */}
      <section
        id="stats"
        ref={statsView.ref}
        className="border-y border-border bg-muted/30"
      >
        <div
          className={`max-w-6xl mx-auto px-6 py-14 grid grid-cols-1 sm:grid-cols-3 gap-10 text-center transition-all duration-700 ${
            statsView.isInView
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-6"
          }`}
        >
          <div>
            <div className="text-4xl font-bold text-foreground mb-1">
              <AnimatedCounter target={10000} suffix="+" />
            </div>
            <p className="text-sm text-muted-foreground">
              Connections managed
            </p>
          </div>
          <div>
            <div className="text-4xl font-bold text-foreground mb-1">
              <AnimatedCounter target={50000} suffix="+" />
            </div>
            <p className="text-sm text-muted-foreground">Messages sent</p>
          </div>
          <div>
            <div className="text-4xl font-bold text-foreground mb-1">
              <AnimatedCounter target={98} suffix="%" />
            </div>
            <p className="text-sm text-muted-foreground">
              Satisfaction rate
            </p>
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────── */}
      <section id="features" ref={featuresView.ref} className="py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-6">
          <div
            className={`text-center mb-14 transition-all duration-700 ${
              featuresView.isInView
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-6"
            }`}
          >
            <Badge variant="secondary" className="mb-4 gap-1.5">
              <Zap className="w-3 h-3" />
              Features
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Everything you need to grow
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Powerful tools designed to supercharge your LinkedIn outreach
              workflow from start to finish.
            </p>
          </div>

          <div
            className={`grid sm:grid-cols-2 gap-6 transition-all duration-700 delay-200 ${
              featuresView.isInView
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-6"
            }`}
          >
            <FeatureCard
              icon={Users}
              title="Smart Connections"
              description="Import, organize, and segment your connections with intelligent tagging and filters for laser-focused outreach."
              hoverClass="group-hover:animate-bounce"
            />
            <FeatureCard
              icon={Send}
              title="Automated Messaging"
              description="Craft personalized messages at scale with smart templates and scheduling that feels genuinely human."
              hoverClass="group-hover:translate-x-1.5"
            />
            <FeatureCard
              icon={Zap}
              title="Drip Sequences"
              description="Build multi-step follow-up sequences with conditional logic, delays, and automatic stop-on-reply."
              hoverClass="group-hover:rotate-[360deg]"
            />
            <FeatureCard
              icon={FileText}
              title="Template Library"
              description="Access proven message templates for connection requests, follow-ups, and introductions — or create your own."
              hoverClass="group-hover:scale-125"
            />
          </div>
        </div>
      </section>

      {/* ── CTA Section ────────────────────────────────────────── */}
      <section id="cta" ref={ctaView.ref} className="relative overflow-hidden">
        <div className="absolute inset-0 bg-mesh opacity-30 pointer-events-none" />
        <div
          className={`max-w-6xl mx-auto px-6 py-20 md:py-28 text-center relative z-10 transition-all duration-700 ${
            ctaView.isInView
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-6"
          }`}
        >
          <div className="shimmer-border inline-block rounded-2xl p-px mb-0">
            <div className="bg-card rounded-2xl px-10 py-14 md:px-20">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                Ready to transform your outreach?
              </h2>
              <p className="text-muted-foreground max-w-md mx-auto mb-8 leading-relaxed">
                Join thousands of professionals who are building better
                relationships on LinkedIn with less effort.
              </p>
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <Button asChild size="lg">
                  <Link href="/login">
                    Get Started Free <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link href="/login">View Demo</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="border-t border-border bg-muted/20">
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <Linkedin className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="text-sm font-medium text-foreground">
              LinkedIn Connect
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} LinkedIn Connect. All rights
            reserved.
          </p>
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Terms
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
