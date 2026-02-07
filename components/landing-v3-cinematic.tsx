"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Linkedin,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  Users,
  MessageSquare,
  Zap,
} from "lucide-react"
import { useInView } from "@/hooks/use-in-view"

/* ─── Connection card data ─── */
const connectionCards = [
  { name: "Sarah Chen", title: "VP of Engineering at Stripe" },
  { name: "Marcus Johnson", title: "Head of Growth at Notion" },
  { name: "Elena Rodriguez", title: "CTO at Figma" },
]

/* ─── Chat messages ─── */
const chatMessages = [
  { fromMe: true, text: "Hi Sarah, loved your talk on scaling distributed systems." },
  { fromMe: false, text: "Thanks Marcus! Would love to chat more about it." },
  { fromMe: true, text: "How about a quick call this week?" },
]

/* ─── Stats data ─── */
const stats = [
  { value: "10K+", label: "Connections managed" },
  { value: "50K+", label: "Messages sent" },
  { value: "98%", label: "Satisfaction rate" },
]

export function LandingCinematic() {
  const hero = useInView(0.1)
  const connections = useInView(0.2)
  const messaging = useInView(0.2)
  const sequences = useInView(0.2)
  const trust = useInView(0.2)
  const cta = useInView(0.1)

  return (
    <div
      className="h-screen overflow-y-auto"
      style={{ scrollSnapType: "y mandatory" }}
    >
      {/* ════════════════════════════════════════════
          Section 1 — Hero
          ════════════════════════════════════════════ */}
      <section
        ref={hero.ref}
        className="relative h-screen flex flex-col items-center justify-center bg-[#191919] text-white overflow-hidden"
        style={{ scrollSnapAlign: "start" }}
      >
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl animate-float" />
        <div className="pointer-events-none absolute bottom-1/4 -right-32 w-80 h-80 rounded-full bg-primary/5 blur-3xl animate-float stagger-3" />

        {/* Back link */}
        <Link
          href="/"
          className="absolute top-6 left-6 flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors z-10"
        >
          <ArrowLeft className="w-4 h-4" />
          All Designs
        </Link>

        {/* Content */}
        <div className={`text-center px-6 max-w-4xl ${hero.isInView ? "animate-fade-up" : "opacity-0"}`}>
          <div className="flex items-center justify-center gap-2.5 mb-8">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Linkedin className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-semibold tracking-tight">LinkedIn Connect</span>
          </div>

          <h1 className="text-6xl md:text-8xl font-bold tracking-tighter leading-[0.95]">
            Your Network.
            <br />
            <span className="gradient-text">Amplified.</span>
          </h1>

          <p className={`mt-6 text-lg md:text-xl text-white/60 max-w-lg mx-auto ${hero.isInView ? "animate-fade-up stagger-2" : "opacity-0"}`}>
            Manage connections, automate outreach, and grow your professional
            network — all from one place.
          </p>

          <div className={`mt-10 ${hero.isInView ? "animate-fade-up stagger-3" : "opacity-0"}`}>
            <Button asChild size="lg" className="shadow-lg hover:shadow-xl transition-shadow">
              <Link href="/login">
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 flex flex-col items-center gap-2 text-white/40 animate-float">
          <span className="text-xs tracking-widest uppercase">Scroll</span>
          <ChevronDown className="w-5 h-5" />
        </div>
      </section>

      {/* ════════════════════════════════════════════
          Section 2 — Feature: Connections
          ════════════════════════════════════════════ */}
      <section
        ref={connections.ref}
        className="h-screen flex items-center bg-background overflow-hidden"
        style={{ scrollSnapAlign: "start" }}
      >
        <div className="mx-auto max-w-6xl w-full px-6 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Left — Big number */}
          <div className={connections.isInView ? "animate-slide-up-in" : "opacity-0"}>
            <Users className="w-8 h-8 text-primary mb-4" />
            <p className="text-7xl md:text-9xl font-bold tracking-tighter gradient-text leading-none">
              2,847
            </p>
            <p className="mt-4 text-xl md:text-2xl text-muted-foreground">
              connections at your fingertips
            </p>
          </div>

          {/* Right — Stacked cards */}
          <div className="relative h-72 md:h-80">
            {connectionCards.map((card, i) => (
              <div
                key={card.name}
                className={`absolute w-72 md:w-80 bg-card border border-border rounded-xl p-5 shadow-lg ${
                  connections.isInView
                    ? `animate-slide-in-right stagger-${i + 2}`
                    : "opacity-0"
                }`}
                style={{
                  top: `${i * 28}px`,
                  right: `${i * 16}px`,
                  transform: `rotate(${(i - 1) * -3}deg)`,
                  zIndex: 3 - i,
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                    {card.name[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-card-foreground text-sm">{card.name}</p>
                    <p className="text-xs text-muted-foreground">{card.title}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          Section 3 — Feature: Messaging
          ════════════════════════════════════════════ */}
      <section
        ref={messaging.ref}
        className="h-screen flex items-center bg-background overflow-hidden"
        style={{ scrollSnapAlign: "start" }}
      >
        <div className="mx-auto max-w-6xl w-full px-6 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Left — Chat mockup */}
          <div className="order-2 md:order-1 space-y-4">
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.fromMe ? "justify-end" : "justify-start"} ${
                  messaging.isInView
                    ? `animate-message-send stagger-${i + 2}`
                    : "opacity-0"
                }`}
              >
                <div
                  className={`max-w-xs px-4 py-2.5 rounded-2xl text-sm ${
                    msg.fromMe
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted text-foreground rounded-bl-md"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          {/* Right — Big text */}
          <div className={`order-1 md:order-2 ${messaging.isInView ? "animate-slide-up-in" : "opacity-0"}`}>
            <MessageSquare className="w-8 h-8 text-primary mb-4" />
            <h2 className="text-5xl md:text-7xl font-bold tracking-tighter leading-[0.95]">
              Every message,
              <br />
              <span className="gradient-text">personal.</span>
            </h2>
            <p className="mt-4 text-xl text-muted-foreground max-w-md">
              Craft meaningful conversations that feel human, not automated.
            </p>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          Section 4 — Feature: Sequences
          ════════════════════════════════════════════ */}
      <section
        ref={sequences.ref}
        className="h-screen flex items-center bg-background overflow-hidden"
        style={{ scrollSnapAlign: "start" }}
      >
        <div className="mx-auto max-w-4xl w-full px-6 text-center">
          <div className={sequences.isInView ? "animate-slide-up-in" : "opacity-0"}>
            <Zap className="w-8 h-8 text-primary mx-auto mb-4" />
            <h2 className="text-5xl md:text-7xl font-bold tracking-tighter">
              Automate.
              <br />
              <span className="gradient-text">Don&apos;t spam.</span>
            </h2>
            <p className="mt-4 text-xl text-muted-foreground max-w-lg mx-auto">
              Build intelligent sequences that respect your contacts and your brand.
            </p>
          </div>

          {/* Timeline */}
          <div className="mt-16 flex items-center justify-center gap-0">
            {["Connect", "Follow up", "Close"].map((label, i) => (
              <div key={label} className="flex items-center">
                {/* Node */}
                <div
                  className={`flex flex-col items-center ${
                    sequences.isInView
                      ? `animate-scale-fade-in stagger-${i + 2}`
                      : "opacity-0"
                  }`}
                >
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg shadow-lg animate-glow-pulse"
                    style={{ animationDelay: `${i * 600}ms` }}
                  >
                    {i + 1}
                  </div>
                  <span className="mt-3 text-sm md:text-base font-medium text-foreground">
                    {label}
                  </span>
                </div>
                {/* Connector line */}
                {i < 2 && (
                  <div
                    className={`w-16 md:w-24 h-0.5 bg-primary/40 mx-2 mb-6 ${
                      sequences.isInView
                        ? `animate-scale-fade-in stagger-${i + 3}`
                        : "opacity-0"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          Section 5 — Stats / Trust
          ════════════════════════════════════════════ */}
      <section
        ref={trust.ref}
        className="h-screen flex items-center bg-accent/30 overflow-hidden"
        style={{ scrollSnapAlign: "start" }}
      >
        <div className="mx-auto max-w-5xl w-full px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8 text-center">
            {stats.map((stat, i) => (
              <div
                key={stat.label}
                className={trust.isInView ? `animate-slide-up-in stagger-${i + 1}` : "opacity-0"}
              >
                <p className="text-7xl md:text-8xl font-bold tracking-tighter gradient-text leading-none">
                  {stat.value}
                </p>
                <p className="mt-4 text-lg md:text-xl text-muted-foreground">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          Section 6 — Final CTA
          ════════════════════════════════════════════ */}
      <section
        ref={cta.ref}
        className="relative h-screen flex flex-col items-center justify-center bg-[#191919] text-white overflow-hidden"
        style={{ scrollSnapAlign: "start" }}
      >
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute top-1/3 left-1/4 w-72 h-72 rounded-full bg-primary/10 blur-3xl animate-float" />
        <div className="pointer-events-none absolute bottom-1/3 right-1/4 w-64 h-64 rounded-full bg-primary/5 blur-3xl animate-float stagger-4" />

        <div className={`text-center px-6 ${cta.isInView ? "animate-slide-up-in" : "opacity-0"}`}>
          <h2 className="text-7xl md:text-9xl font-bold tracking-tighter">
            Ready?
          </h2>

          <div className={`mt-10 ${cta.isInView ? "animate-fade-up stagger-2" : "opacity-0"}`}>
            <Button asChild size="lg" className="shadow-lg hover:shadow-xl transition-shadow">
              <Link href="/login">
                Start Now
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Footer info */}
        <div className="absolute bottom-6 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-white/40">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
              <Linkedin className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-medium text-white/60">LinkedIn Connect</span>
          </div>
          <p className="text-xs text-white/30">
            &copy; {new Date().getFullYear()} LinkedIn Connect. All rights reserved.
          </p>
        </div>
      </section>
    </div>
  )
}
