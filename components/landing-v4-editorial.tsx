"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Linkedin } from "lucide-react"
import { useInView } from "@/hooks/use-in-view"

function Section({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const { ref, isInView } = useInView(0.1)
  return (
    <div ref={ref} className={`${isInView ? "animate-fade-up" : "opacity-0"} ${className}`}>
      {children}
    </div>
  )
}

const features = [
  { num: "01", title: "Connections", desc: "Discover and reach the people who matter to your pipeline." },
  { num: "02", title: "Messaging", desc: "Conversations that read like they were written by hand." },
  { num: "03", title: "Sequences", desc: "Multi-step follow-ups that respect your recipient's time." },
  { num: "04", title: "Templates", desc: "Reusable frameworks that still feel personal every time." },
]

const steps = [
  { num: "01", title: "Import your network", desc: "Connect your LinkedIn account and let us map your professional graph." },
  { num: "02", title: "Craft your sequences", desc: "Build message flows from templates or start from a blank canvas." },
  { num: "03", title: "Watch it work", desc: "Messages send on your schedule. Replies land in your inbox." },
]

export function LandingEditorial() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <nav className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
                <Linkedin className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <span className="text-sm font-semibold tracking-[-0.02em]">LinkedIn Connect</span>
            </Link>
            <Link
              href="/"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              &larr; All Designs
            </Link>
          </div>
          <Link
            href="/auth/signin"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Sign in
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <Section>
        <section className="mx-auto max-w-5xl px-6 py-32 md:py-44">
          <div className="grid gap-12 md:grid-cols-[1.5fr_1fr] md:gap-16">
            <h1 className="text-5xl font-semibold leading-[0.95] tracking-[-0.04em] md:text-7xl">
              Professional
              <br />
              outreach,
              <br />
              thoughtfully
              <br />
              automated.
            </h1>
            <div className="flex flex-col justify-end gap-8">
              <p className="text-lg leading-relaxed text-muted-foreground">
                A quieter way to grow your network. Automate LinkedIn messaging
                with sequences that feel personal, timely, and genuinely helpful.
              </p>
              <div>
                <Button variant="outline" asChild>
                  <Link href="/auth/signin">Get started</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </Section>

      {/* Divider */}
      <hr className="border-border" />

      {/* Features */}
      <Section>
        <section className="mx-auto max-w-5xl px-6 py-24 md:py-32">
          <div className="grid grid-cols-1 gap-y-0 md:grid-cols-[80px_1fr_1fr]">
            {features.map((f, i) => (
              <div key={f.num} className="contents">
                {i > 0 && (
                  <hr className="col-span-1 border-border md:col-span-3" />
                )}
                <div className="pb-2 pt-12 font-mono text-xs uppercase tracking-widest text-muted-foreground md:pb-0 md:pt-12">
                  {f.num}
                </div>
                <div className="pb-1 text-2xl font-semibold tracking-[-0.04em] md:pb-0 md:pt-12 md:text-3xl">
                  {f.title}
                </div>
                <div className="pb-12 leading-relaxed text-muted-foreground md:pt-[3.25rem]">
                  {f.desc}
                </div>
              </div>
            ))}
            <hr className="col-span-1 border-border md:col-span-3" />
          </div>
        </section>
      </Section>

      {/* Pull Quote */}
      <Section>
        <section className="mx-auto max-w-3xl px-6 py-24 md:py-32">
          <hr className="mb-16 border-border" />
          <p className="text-center text-3xl font-normal italic leading-snug tracking-[-0.02em] text-foreground md:text-4xl">
            &ldquo;The best outreach doesn&rsquo;t feel like outreach.&rdquo;
          </p>
          <hr className="mt-16 border-border" />
        </section>
      </Section>

      {/* How it Works */}
      <Section>
        <section className="mx-auto max-w-5xl px-6 py-24 md:py-32">
          <h2 className="mb-16 text-xs font-mono uppercase tracking-widest text-muted-foreground">
            How it works
          </h2>
          <div className="grid gap-12 md:grid-cols-3 md:gap-0">
            {steps.map((s, i) => (
              <div
                key={s.num}
                className={`${
                  i > 0 ? "border-t border-border pt-12 md:border-l md:border-t-0 md:pl-10 md:pt-0" : ""
                }`}
              >
                <span className="font-mono text-xs tracking-widest text-primary">
                  {s.num}
                </span>
                <h3 className="mt-4 text-lg font-semibold tracking-[-0.02em]">
                  {s.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </section>
      </Section>

      {/* Divider */}
      <hr className="border-border" />

      {/* CTA */}
      <Section>
        <section className="mx-auto max-w-5xl px-6 py-32 md:py-44 text-center">
          <h2 className="text-4xl font-semibold tracking-[-0.04em]">Begin.</h2>
          <Link
            href="/auth/signin"
            className="mt-6 inline-block text-primary transition-colors hover:underline"
          >
            Create your account &rarr;
          </Link>
        </section>
      </Section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
          <span className="text-sm text-muted-foreground">LinkedIn Connect</span>
          <span className="text-sm text-muted-foreground">&copy; 2026</span>
        </div>
      </footer>
    </div>
  )
}
