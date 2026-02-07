import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
  Link2,
  Search,
  Send,
} from "lucide-react"

const features = [
  {
    icon: Users,
    title: "Connections",
    description: "Browse, search, and manage your entire LinkedIn network in one place.",
  },
  {
    icon: MessageSquare,
    title: "Smart Messaging",
    description: "Send personalized messages to your connections with a streamlined inbox.",
  },
  {
    icon: Zap,
    title: "Sequences",
    description: "Automate multi-step outreach campaigns that run on your schedule.",
  },
  {
    icon: FileText,
    title: "Templates",
    description: "Save and reuse message templates with dynamic personalization fields.",
  },
]

const steps = [
  {
    number: "01",
    icon: Link2,
    title: "Connect your LinkedIn",
    description: "Securely link your account in one click.",
  },
  {
    number: "02",
    icon: Search,
    title: "Find your audience",
    description: "Search and filter your professional network.",
  },
  {
    number: "03",
    icon: Send,
    title: "Start conversations",
    description: "Send personalized messages at scale.",
  },
]

const trustItems = [
  { icon: Shield, label: "Secure Connection" },
  { icon: Lock, label: "Privacy First" },
  { icon: Globe, label: "Professional Grade" },
]

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 glass border-b border-border">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center transition-colors duration-200 group-hover:bg-[var(--primary-hover)]">
              <Linkedin className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold text-foreground tracking-tight">
              LinkedIn Connect
            </span>
          </Link>

          {/* Nav links — hidden on mobile */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">
              How it Works
            </a>
          </div>

          {/* CTA */}
          <Button asChild size="sm">
            <Link href="/login">
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative bg-mesh overflow-hidden">
        {/* Subtle decorative orbs */}
        <div className="pointer-events-none absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />

        <div className="relative mx-auto max-w-3xl px-6 py-28 md:py-40 text-center">
          <div className="animate-fade-up">
            <Badge variant="secondary" className="mb-6 px-3 py-1 text-xs font-medium">
              <Sparkles className="w-3 h-3" />
              LinkedIn outreach, simplified
            </Badge>
          </div>

          <h1 className="animate-fade-up stagger-1 text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground leading-[1.1]">
            Your network,{" "}
            <span className="gradient-text">one conversation</span>{" "}
            at a time
          </h1>

          <p className="animate-fade-up stagger-2 mt-6 text-lg md:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Search connections, send personalized messages, and automate
            outreach — all from a single, clean dashboard.
          </p>

          <div className="animate-fade-up stagger-3 mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="shadow-md hover:shadow-lg transition-shadow">
              <Link href="/login">
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href="#features">Learn More</a>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="animate-fade-up text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Everything you need to connect
          </h2>
          <p className="animate-fade-up stagger-1 mt-4 text-muted-foreground text-lg">
            Four powerful tools, one simple interface.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, i) => (
            <Card
              key={feature.title}
              className={`card-hover animate-fade-up stagger-${i + 1} border border-border`}
            >
              <CardContent className="pt-6">
                <div className="w-11 h-11 rounded-xl bg-accent flex items-center justify-center mb-5">
                  <feature.icon className="w-5 h-5 text-accent-foreground" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── How it Works ── */}
      <section id="how-it-works" className="bg-secondary/50">
        <div className="mx-auto max-w-4xl px-6 py-24 md:py-32">
          <div className="text-center mb-16">
            <h2 className="animate-fade-up text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              Three steps. That&apos;s it.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
            {steps.map((step, i) => (
              <div
                key={step.number}
                className={`animate-fade-up stagger-${i + 1} text-center md:text-left`}
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-5">
                  <step.icon className="w-5 h-5 text-primary" />
                </div>
                <p className="text-xs font-semibold text-primary tracking-widest uppercase mb-2">
                  Step {step.number}
                </p>
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust Bar ── */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto max-w-4xl px-6 py-8 flex flex-wrap items-center justify-center gap-8 md:gap-16">
          {trustItems.map((item) => (
            <div key={item.label} className="flex items-center gap-2.5 text-muted-foreground">
              <item.icon className="w-4 h-4" />
              <span className="text-sm font-medium">{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="bg-mesh">
        <div className="mx-auto max-w-3xl px-6 py-24 md:py-32 text-center">
          <h2 className="animate-fade-up text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Ready to streamline your outreach?
          </h2>
          <p className="animate-fade-up stagger-1 mt-4 text-muted-foreground text-lg">
            Connect your LinkedIn account and start meaningful conversations today.
          </p>
          <div className="animate-fade-up stagger-2 mt-8">
            <Button asChild size="lg" className="shadow-md hover:shadow-lg transition-shadow">
              <Link href="/login">
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border bg-card">
        <div className="mx-auto max-w-6xl px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
              <Linkedin className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="font-medium text-foreground">LinkedIn Connect</span>
          </div>

          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} LinkedIn Connect. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
