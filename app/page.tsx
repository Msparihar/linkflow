import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Linkedin,
  Moon,
  LayoutGrid,
  Film,
  BookOpen,
  Gamepad2,
  ArrowRight,
} from "lucide-react"

const variants = [
  {
    id: "v1",
    name: "Dark Aurora",
    desc: "Animated aurora gradients, glassmorphic cards, glowing typography",
    icon: Moon,
  },
  {
    id: "v2",
    name: "Bento Grid",
    desc: "Apple-style asymmetric grid with mini UI mockups in each tile",
    icon: LayoutGrid,
  },
  {
    id: "v3",
    name: "Scroll Cinematic",
    desc: "Full-viewport sections with scroll-snap and parallax reveals",
    icon: Film,
  },
  {
    id: "v4",
    name: "Editorial Minimal",
    desc: "Magazine-style asymmetric layouts with extreme whitespace",
    icon: BookOpen,
  },
  {
    id: "v5",
    name: "Interactive Playground",
    desc: "Live dashboard mockup with typing animations and counters",
    icon: Gamepad2,
  },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-mesh">
      <div className="mx-auto max-w-4xl px-6 py-16 md:py-24">
        {/* Header */}
        <div className="text-center mb-16 animate-fade-up">
          <div className="mx-auto w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mb-6">
            <Linkedin className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
            LinkedIn Connect
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Choose a landing page design to preview
          </p>
        </div>

        {/* Variant Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {variants.map((v, i) => (
            <Link key={v.id} href={`/${v.id}`} className="group">
              <Card className={`card-hover h-full animate-fade-up stagger-${i + 1} border border-border`}>
                <CardContent className="pt-6">
                  <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-colors">
                    <v.icon className="w-5 h-5 text-accent-foreground" />
                  </div>
                  <h2 className="font-semibold text-foreground mb-1 flex items-center gap-2">
                    {v.name}
                    <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {v.desc}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Footer link */}
        <div className="text-center mt-12">
          <Button asChild variant="outline">
            <Link href="/login">Go to Login</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
