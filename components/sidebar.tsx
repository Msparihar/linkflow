"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Users,
  MessageSquare,
  FileText,
  ChevronLeft,
  ChevronRight,
  Linkedin,
  LogOut,
  Search,
  Zap
} from "lucide-react"
import { cn } from "@/lib/utils"

interface SidebarProps {
  linkedinConnected: boolean
  onLogout: () => void
}

export function Sidebar({
  linkedinConnected,
  onLogout
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  const navItems = [
    {
      id: "connections",
      href: "/dashboard/connections",
      label: "Connections",
      icon: Users,
      requiresLinkedin: true
    },
    {
      id: "chats",
      href: "/dashboard/chats",
      label: "Messages",
      icon: MessageSquare,
      requiresLinkedin: true
    },
    {
      id: "search",
      href: "/dashboard/search",
      label: "Search",
      icon: Search,
      requiresLinkedin: true
    },
    {
      id: "sequences",
      href: "/dashboard/sequences",
      label: "Sequences",
      icon: Zap,
      requiresLinkedin: false
    },
    {
      id: "templates",
      href: "/dashboard/templates",
      label: "Templates",
      icon: FileText,
      requiresLinkedin: false
    },
  ]

  return (
    <div
      className={cn(
        "h-screen bg-card border-r border-border flex flex-col transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Linkedin className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">LinkedIn Connect</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(collapsed && "mx-auto")}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")
          const isDisabled = item.requiresLinkedin && !linkedinConnected

          return (
            <Button
              key={item.id}
              variant={isActive ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start gap-3",
                collapsed && "justify-center px-2"
              )}
              asChild={!isDisabled}
              disabled={isDisabled}
            >
              {isDisabled ? (
                <>
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
                </>
              ) : (
                <Link href={item.href}>
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
                </Link>
              )}
            </Button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-border space-y-1">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-3 text-muted-foreground",
            collapsed && "justify-center px-2"
          )}
          onClick={onLogout}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </Button>
      </div>
    </div>
  )
}
