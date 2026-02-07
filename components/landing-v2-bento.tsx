"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Linkedin,
  Users,
  MessageSquare,
  Zap,
  FileText,
  Shield,
  Lock,
  ArrowRight,
  Globe,
  Sparkles,
  Search,
  Send,
  ArrowLeft,
  Check,
} from "lucide-react"
import { useInView } from "@/hooks/use-in-view"

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
  const { ref: heroRef, isInView: heroVisible } = useInView()
  const { ref: trustRef, isInView: trustVisible } = useInView()
  const { ref: ctaRef, isInView: ctaVisible } = useInView()

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 font-semibold text-foreground">
              <Linkedin className="size-5 text-primary" />
              LinkedIn Connect
            </Link>
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
              <ArrowLeft className="size-3.5" /> All Designs
            </Link>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#trust" className="hover:text-foreground transition-colors">Security</a>
          </div>
          <Button asChild size="sm">
            <Link href="/login">Get Started</Link>
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section ref={heroRef} className="pt-24 pb-16 px-6 text-center scroll-mt-20">
        <div className={`max-w-3xl mx-auto ${heroVisible ? "animate-fade-up" : "opacity-0"}`}>
          <Badge variant="secondary" className="mb-6">
            <Sparkles className="size-3" /> Smarter LinkedIn Outreach
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground leading-[1.1] mb-5">
            Grow your network,{" "}
            <span className="gradient-text">close more deals</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
            Automate personalized messaging, manage connections, and build sequences
            that convert — all from one clean dashboard.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/login">
                Start for Free <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href="#features">See Features</a>
            </Button>
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

      {/* Trust Bar */}
      <section id="trust" ref={trustRef} className="py-12 px-6 border-y border-border bg-muted/30 scroll-mt-20">
        <div
          className={`max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 ${
            trustVisible ? "animate-fade-up" : "opacity-0"
          }`}
        >
          {[
            { icon: Shield, label: "Enterprise-grade security" },
            { icon: Lock, label: "End-to-end encryption" },
            { icon: Globe, label: "GDPR compliant" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 text-muted-foreground">
              <Icon className="size-5" />
              <span className="text-sm font-medium">{label}</span>
            </div>
          ))}
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
