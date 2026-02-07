"use client"

import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/sidebar"

interface DashboardShellProps {
  linkedinConnected: boolean
  children: React.ReactNode
}

export function DashboardShell({ linkedinConnected, children }: DashboardShellProps) {
  const router = useRouter()

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/")
    router.refresh()
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        linkedinConnected={linkedinConnected}
        onLogout={handleLogout}
      />
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden bg-pattern">
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-6 lg:p-8 [&:has(>[data-fill-height])]:overflow-hidden">
          <div className="flex-1 flex flex-col min-h-0 max-w-7xl mx-auto w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
