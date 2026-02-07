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
  Unlink,
  Search,
  Zap,
  Sparkles
} from "lucide-react"
import { cn } from "@/lib/utils"

interface SidebarProps {
  linkedinConnected: boolean
  onLogout: () => void
  onDisconnectLinkedin: () => void
}

export function Sidebar({
  linkedinConnected,
  onLogout,
  onDisconnectLinkedin
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
    <aside
      className={cn(
        "h-screen bg-card border-r border-border flex flex-col transition-all duration-300 ease-in-out relative",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      {/* Header */}
      <div className={cn(
        "p-4 border-b border-border",
        collapsed ? "px-3" : "px-5"
      )}>
        <div className={cn(
          "flex items-center",
          collapsed ? "justify-center" : "justify-between"
        )}>
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="w-9 h-9 bg-[#0A66C2] rounded-lg flex items-center justify-center group-hover:bg-[#004182] transition-colors duration-200">
              <Linkedin className="w-5 h-5 text-white" />
            </div>
            {!collapsed && (
              <span className="font-semibold text-foreground text-lg">
                Connect
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Collapse toggle button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 bg-card border border-border rounded-full flex items-center justify-center shadow-sm hover:shadow-md hover:bg-muted transition-all duration-200 z-10"
      >
        {collapsed ? (
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </button>

      {/* Navigation */}
      <nav className={cn(
        "flex-1 py-4 space-y-1",
        collapsed ? "px-2" : "px-3"
      )}>
        {/* Section label */}
        {!collapsed && (
          <div className="px-3 py-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Menu
            </span>
          </div>
        )}

        {navItems.map((item, index) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")
          const isDisabled = item.requiresLinkedin && !linkedinConnected

          return (
            <div
              key={item.id}
            >
              {isDisabled ? (
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground/50 cursor-not-allowed",
                    collapsed && "justify-center px-2"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && (
                    <span className="text-sm font-medium">{item.label}</span>
                  )}
                </div>
              ) : (
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group relative",
                    collapsed && "justify-center px-2",
                    isActive
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  {/* Active indicator bar */}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] bg-primary rounded-r-full" />
                  )}

                  <item.icon className={cn(
                    "w-5 h-5 flex-shrink-0 transition-transform duration-150",
                    !isActive && "group-hover:scale-110"
                  )} />

                  {!collapsed && (
                    <span className="text-sm">{item.label}</span>
                  )}
                </Link>
              )}
            </div>
          )
        })}
      </nav>

      {/* LinkedIn connection status */}
      {!linkedinConnected && !collapsed && (
        <div className="mx-3 mb-4 p-3 bg-accent/50 rounded-lg border border-primary/20 animate-fade-up">
          <div className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-xs font-medium text-foreground">Connect LinkedIn</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Link your account to unlock messaging features.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className={cn(
        "p-3 border-t border-border space-y-1",
        collapsed && "px-2"
      )}>
        {linkedinConnected && (
          <Button
            variant="ghost"
            onClick={onDisconnectLinkedin}
            className={cn(
              "w-full justify-start gap-3 text-muted-foreground hover:text-orange-600 hover:bg-orange-500/10 transition-colors",
              collapsed && "justify-center px-2"
            )}
            title={collapsed ? "Disconnect LinkedIn" : undefined}
          >
            <Unlink className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="text-sm">Disconnect LinkedIn</span>}
          </Button>
        )}
        <Button
          variant="ghost"
          onClick={onLogout}
          className={cn(
            "w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors",
            collapsed && "justify-center px-2"
          )}
          title={collapsed ? "Logout" : undefined}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm">Logout</span>}
        </Button>
      </div>
    </aside>
  )
}
