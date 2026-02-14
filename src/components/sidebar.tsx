"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Users,
  MessageSquare,
  FileText,
  Menu,
  X,
  Linkedin,
  LogOut,
  Unlink,
  Search,
  Zap,
  Briefcase,
  Sparkles
} from "lucide-react"
import { cn } from "@/lib/utils"

interface SidebarProps {
  linkedinConnected: boolean
  onLogout: () => void
  onDisconnectLinkedin: () => void
  collapsed: boolean
  onToggle: () => void
  mobileOpen: boolean
  onMobileClose: () => void
}

export function Sidebar({
  linkedinConnected,
  onLogout,
  onDisconnectLinkedin,
  collapsed,
  onToggle,
  mobileOpen,
  onMobileClose,
}: SidebarProps) {
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
      id: "jobs",
      href: "/dashboard/jobs",
      label: "Jobs",
      icon: Briefcase,
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

  const sidebarContent = (
    <aside
      className={cn(
        "h-screen bg-card border-r border-border flex flex-col transition-all duration-300 ease-in-out relative",
        // Mobile: always full width
        "max-md:w-64",
        // Desktop: collapsible
        collapsed ? "md:w-[72px]" : "md:w-64"
      )}
    >
      {/* Header */}
      <div className={cn(
        "p-4 border-b border-border",
        collapsed ? "md:px-3" : "px-5"
      )}>
        <div className={cn(
          "flex items-center",
          collapsed ? "md:justify-center" : "justify-between"
        )}>
          <Link href="/dashboard" className="flex items-center gap-3 group" onClick={onMobileClose}>
            <div className="w-9 h-9 bg-[#0A66C2] rounded-lg flex items-center justify-center group-hover:bg-[#004182] transition-colors duration-200">
              <Linkedin className="w-5 h-5 text-white" />
            </div>
            {(!collapsed || mobileOpen) && (
              <span className={cn(
                "font-semibold text-foreground text-lg",
                collapsed && !mobileOpen && "md:hidden"
              )}>
                Connect
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Desktop collapse toggle */}
      <button
        onClick={onToggle}
        className="hidden md:flex absolute -right-3 top-20 w-6 h-6 bg-card border border-border rounded-full items-center justify-center shadow-sm hover:shadow-md hover:bg-muted transition-all duration-200 z-10"
      >
        <Menu className="w-3.5 h-3.5 text-muted-foreground" />
      </button>

      {/* Mobile close button */}
      <button
        onClick={onMobileClose}
        className="md:hidden absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
      >
        <X className="w-5 h-5 text-muted-foreground" />
      </button>

      {/* Navigation */}
      <nav className={cn(
        "flex-1 py-4 space-y-1",
        collapsed ? "md:px-2 max-md:px-3" : "px-3"
      )}>
        {/* Section label */}
        {(!collapsed || mobileOpen) && (
          <div className={cn("px-3 py-2", collapsed && !mobileOpen && "md:hidden")}>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Menu
            </span>
          </div>
        )}

        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")
          const isDisabled = item.requiresLinkedin && !linkedinConnected
          const showLabel = !collapsed || mobileOpen

          return (
            <div key={item.id}>
              {isDisabled ? (
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground/50 cursor-not-allowed",
                    collapsed && !mobileOpen && "md:justify-center md:px-2"
                  )}
                  title={collapsed && !mobileOpen ? item.label : undefined}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {showLabel && (
                    <span className={cn("text-sm font-medium", collapsed && !mobileOpen && "md:hidden")}>{item.label}</span>
                  )}
                </div>
              ) : (
                <Link
                  href={item.href}
                  onClick={onMobileClose}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group relative",
                    collapsed && !mobileOpen && "md:justify-center md:px-2",
                    isActive
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  title={collapsed && !mobileOpen ? item.label : undefined}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] bg-primary rounded-r-full" />
                  )}
                  <item.icon className={cn(
                    "w-5 h-5 flex-shrink-0 transition-transform duration-150",
                    !isActive && "group-hover:scale-110"
                  )} />
                  {showLabel && (
                    <span className={cn("text-sm", collapsed && !mobileOpen && "md:hidden")}>{item.label}</span>
                  )}
                </Link>
              )}
            </div>
          )
        })}
      </nav>

      {/* LinkedIn connection status */}
      {!linkedinConnected && (!collapsed || mobileOpen) && (
        <div className={cn("mx-3 mb-4 p-3 bg-accent/50 rounded-lg border border-primary/20 animate-fade-up", collapsed && !mobileOpen && "md:hidden")}>
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
        collapsed && !mobileOpen && "md:px-2"
      )}>
        {linkedinConnected && (
          <Button
            variant="ghost"
            onClick={() => { onDisconnectLinkedin(); onMobileClose(); }}
            className={cn(
              "w-full justify-start gap-3 text-muted-foreground hover:text-orange-600 hover:bg-orange-500/10 transition-colors",
              collapsed && !mobileOpen && "md:justify-center md:px-2"
            )}
            title={collapsed && !mobileOpen ? "Disconnect LinkedIn" : undefined}
          >
            <Unlink className="w-5 h-5 flex-shrink-0" />
            {(!collapsed || mobileOpen) && <span className={cn("text-sm", collapsed && !mobileOpen && "md:hidden")}>Disconnect LinkedIn</span>}
          </Button>
        )}
        <Button
          variant="ghost"
          onClick={() => { onLogout(); onMobileClose(); }}
          className={cn(
            "w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors",
            collapsed && !mobileOpen && "md:justify-center md:px-2"
          )}
          title={collapsed && !mobileOpen ? "Logout" : undefined}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {(!collapsed || mobileOpen) && <span className={cn("text-sm", collapsed && !mobileOpen && "md:hidden")}>Logout</span>}
        </Button>
      </div>
    </aside>
  )

  return (
    <>
      {/* Desktop: inline sidebar */}
      <div className="hidden md:block">
        {sidebarContent}
      </div>

      {/* Mobile: overlay sidebar */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onMobileClose}
          />
          {/* Sidebar panel */}
          <div className="relative z-50 animate-in slide-in-from-left duration-300">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  )
}
