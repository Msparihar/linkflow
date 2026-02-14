"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Menu } from "lucide-react"
import { Sidebar } from "@/components/sidebar"

interface DashboardShellProps {
  linkedinConnected: boolean
  children: React.ReactNode
}

export function DashboardShell({ linkedinConnected, children }: DashboardShellProps) {
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/")
    router.refresh()
  }

  const handleDisconnectLinkedin = async () => {
    await fetch("/api/auth/unipile/disconnect", { method: "POST" })
    router.refresh()
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        linkedinConnected={linkedinConnected}
        onLogout={handleLogout}
        onDisconnectLinkedin={handleDisconnectLinkedin}
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden bg-pattern">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
          <button
            onClick={() => setMobileOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
          >
            <Menu className="w-5 h-5 text-foreground" />
          </button>
          <span className="font-semibold text-foreground">Connect</span>
        </div>

        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-4 md:p-6 lg:p-8 [&:has(>[data-fill-height])]:overflow-hidden">
          <div className="flex-1 flex flex-col min-h-0 max-w-7xl mx-auto w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
