"use client"

import Link from "next/link"
import { useState } from "react"
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
} from "lucide-react"
import { useInView } from "@/hooks/use-in-view"

const features = [
  {
    icon: Users,
    title: "Smart Connections",
    description:
      "Auto-discover and connect with ideal prospects based on industry, role, and mutual interests.",
  },
  {
    icon: MessageSquare,
    title: "Personalized Messaging",
    description:
      "Craft hyper-personalized outreach sequences that feel human, not robotic.",
  },
  {
    icon: Zap,
    title: "Automation Engine",
    description:
      "Schedule follow-ups, track responses, and let the system handle the tedious work.",
  },
  {
    icon: FileText,
    title: "Campaign Analytics",
    description:
      "Real-time dashboards with acceptance rates, reply rates, and conversion tracking.",
  },
]

const steps = [
  {
    number: "01",
    title: "Import Connections",
    description: "Connect your LinkedIn account and import your target audience in seconds.",
    icon: Search,
  },
  {
    number: "02",
    title: "Craft Sequences",
    description: "Build multi-step outreach campaigns with AI-powered personalization.",
    icon: Sparkles,
  },
  {
    number: "03",
    title: "Launch & Scale",
    description: "Hit send and watch your network grow while you focus on closing deals.",
    icon: Send,
  },
]

function FeaturesSection() {
  const { ref, isInView } = useInView()
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  return (
    <section id="features" className="scroll-mt-20 relative py-28 px-6">
      <div ref={ref} className="max-w-6xl mx-auto">
        <div className={`text-center mb-16 ${isInView ? "animate-slide-up-in" : "opacity-0"}`}>
          <Badge variant="secondary" className="mb-4">Features</Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Everything you need to <span className="gradient-text">scale outreach</span>
          </h2>
          <p className="text-[var(--muted-foreground)] text-lg max-w-2xl mx-auto">
            A complete toolkit for LinkedIn professionals who want results without the grind.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              className={`glass-card rounded-2xl p-8 card-hover ${
                hoveredIndex === i ? "shimmer-border" : ""
              } ${isInView ? `animate-slide-up-in stagger-${i + 1}` : "opacity-0"}`}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-[rgba(112,181,249,0.15)] flex items-center justify-center">
                  <feature.icon className="w-6 h-6 text-[var(--primary)]" />
                </div>
                <h3 className="text-xl font-semibold text-white">{feature.title}</h3>
              </div>
              <p className="text-[var(--muted-foreground)] leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function HowItWorksSection() {
  const { ref, isInView } = useInView()

  return (
    <section id="how-it-works" className="scroll-mt-20 relative py-28 px-6">
      <div ref={ref} className="max-w-4xl mx-auto">
        <div className={`text-center mb-20 ${isInView ? "animate-slide-up-in" : "opacity-0"}`}>
          <Badge variant="secondary" className="mb-4">How it Works</Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Three steps to <span className="text-glow">10x your network</span>
          </h2>
        </div>
        <div className="relative">
          {/* Connecting line */}
          <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-[var(--primary)] via-[var(--primary)]/40 to-transparent hidden md:block" />

          <div className="space-y-16">
            {steps.map((step, i) => (
              <div
                key={step.number}
                className={`relative flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-12 ${
                  i % 2 !== 0 ? "md:flex-row-reverse" : ""
                } ${isInView ? `animate-slide-up-in stagger-${(i + 1) * 2}` : "opacity-0"}`}
              >
                {/* Number circle */}
                <div className="relative z-10 mx-auto md:mx-0 flex-shrink-0">
                  <div className="w-16 h-16 rounded-full bg-[var(--background)] border-2 border-[var(--primary)] flex items-center justify-center">
                    <span className="text-lg font-bold gradient-text">{step.number}</span>
                  </div>
                </div>
                {/* Content card */}
                <div className="glass-card rounded-2xl p-8 flex-1 max-w-md mx-auto md:mx-0">
                  <div className="flex items-center gap-3 mb-3">
                    <step.icon className="w-5 h-5 text-[var(--primary)]" />
                    <h3 className="text-xl font-semibold text-white">{step.title}</h3>
                  </div>
                  <p className="text-[var(--muted-foreground)] leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function CtaSection() {
  const { ref, isInView } = useInView()

  return (
    <section className="relative py-28 px-6">
      <div ref={ref} className={`max-w-3xl mx-auto text-center ${isInView ? "animate-scale-fade-in" : "opacity-0"}`}>
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
          Ready to <span className="text-glow">supercharge</span> your LinkedIn?
        </h2>
        <p className="text-[var(--muted-foreground)] text-lg mb-10 max-w-xl mx-auto">
          Join thousands of professionals who automate their outreach and close more deals.
        </p>
        <Button asChild size="lg" className="text-base px-8 h-12 shadow-lg shadow-[var(--primary)]/25">
          <Link href="/login">
            Get Started Free <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </Button>
      </div>
    </section>
  )
}

export function LandingAurora() {
  return (
    <div className="dark">
      <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] overflow-hidden">
        {/* Navbar */}
        <nav className="fixed top-0 left-0 right-0 z-50 glass bg-[rgba(27,31,35,0.85)] border-b border-[var(--border)]">
          <div className="max-w-6xl mx-auto flex items-center justify-between h-16 px-6">
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-2 text-[var(--muted-foreground)] text-sm hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4" />
                All Designs
              </Link>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center">
                  <Linkedin className="w-4 h-4 text-black" />
                </div>
                <span className="font-semibold text-white text-lg">LinkedIn Connect</span>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-[var(--muted-foreground)] hover:text-white transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="text-sm text-[var(--muted-foreground)] hover:text-white transition-colors">
                How it Works
              </a>
              <Button asChild size="sm">
                <Link href="/login">Get Started</Link>
              </Button>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <section className="relative min-h-screen flex items-center justify-center px-6 pt-16">
          {/* Aurora blobs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div
              className="absolute -top-40 -left-40 w-[700px] h-[700px] rounded-full animate-aurora animate-glow-pulse blur-3xl"
              style={{
                background: "radial-gradient(circle, rgba(112,181,249,0.25) 0%, rgba(10,102,194,0.1) 50%, transparent 70%)",
                animationDelay: "0s",
              }}
            />
            <div
              className="absolute top-1/4 -right-32 w-[500px] h-[500px] rounded-full animate-aurora animate-glow-pulse blur-3xl"
              style={{
                background: "radial-gradient(circle, rgba(10,102,194,0.2) 0%, rgba(112,181,249,0.08) 50%, transparent 70%)",
                animationDelay: "3s",
              }}
            />
            <div
              className="absolute -bottom-40 left-1/3 w-[600px] h-[600px] rounded-full animate-aurora animate-glow-pulse blur-3xl"
              style={{
                background: "radial-gradient(circle, rgba(112,181,249,0.18) 0%, rgba(10,102,194,0.06) 50%, transparent 70%)",
                animationDelay: "7s",
              }}
            />
            <div
              className="absolute top-1/2 left-1/4 w-[400px] h-[400px] rounded-full animate-aurora animate-glow-pulse blur-3xl"
              style={{
                background: "radial-gradient(circle, rgba(10,102,194,0.15) 0%, transparent 60%)",
                animationDelay: "11s",
              }}
            />
          </div>

          {/* Hero content */}
          <div className="relative z-10 text-center max-w-4xl mx-auto">
            <Badge variant="secondary" className="mb-6 animate-fade-up">
              <Sparkles className="w-3 h-3 mr-1" /> Now in public beta
            </Badge>
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-6 animate-fade-up stagger-1">
              <span className="text-glow">Automate</span> your LinkedIn{" "}
              <span className="gradient-text">outreach</span>
            </h1>
            <p className="text-lg md:text-xl text-[var(--muted-foreground)] max-w-2xl mx-auto mb-10 animate-fade-up stagger-2">
              Connect, message, and follow up with the right people at scale.
              Build genuine relationships while the automation runs in the background.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up stagger-3">
              <Button asChild size="lg" className="text-base px-8 h-12 shadow-lg shadow-[var(--primary)]/25">
                <Link href="/login">
                  Start for Free <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-base px-8 h-12">
                <a href="#features">See Features</a>
              </Button>
            </div>
          </div>
        </section>

        {/* Features */}
        <FeaturesSection />

        {/* How it Works */}
        <HowItWorksSection />

        {/* CTA */}
        <CtaSection />

        {/* Footer */}
        <footer className="border-t border-[var(--border)] py-10 px-6">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[var(--primary)] flex items-center justify-center">
                <Linkedin className="w-3.5 h-3.5 text-black" />
              </div>
              <span className="font-semibold text-white">LinkedIn Connect</span>
            </div>
            <p className="text-sm text-[var(--muted-foreground)]">
              &copy; {new Date().getFullYear()} LinkedIn Connect. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}
