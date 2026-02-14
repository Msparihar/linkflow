"use client"

import { useState, useEffect, useMemo } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Search,
  Loader2,
  Send,
  Users,
  ArrowUpDown,
  CheckSquare,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react"
import { ConnectionMessageDialog } from "@/components/connection-message-dialog"
import { BulkMessageDialog } from "@/components/bulk-message-dialog"
import { cn } from "@/lib/utils"

interface Connection {
  id: string
  firstName: string
  lastName: string
  headline: string
  profilePicture: string
}

type SortOption = "name-asc" | "name-desc" | "recent"

interface ConnectionsPanelProps {
  onConnectionCountChange?: (count: number) => void
}

export function ConnectionsPanel({ onConnectionCountChange }: ConnectionsPanelProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<SortOption>("name-asc")
  const [page, setPage] = useState(1)
  const perPage = 24
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Bulk selection state
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const queryClient = useQueryClient()

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await fetch("/api/linkedin/connections?fetchAll=true&force=true")
      await queryClient.invalidateQueries({ queryKey: ["connections"] })
    } finally {
      setIsRefreshing(false)
    }
  }

  const { data: connections = [], isLoading } = useQuery({
    queryKey: ["connections"],
    queryFn: async () => {
      const res = await fetch("/api/linkedin/connections?fetchAll=true")
      if (!res.ok) throw new Error("Failed to fetch connections")
      const data = await res.json()
      return (data.connections || []) as Connection[]
    },
  })

  // Report count when connections load
  useEffect(() => {
    if (connections.length > 0) {
      onConnectionCountChange?.(connections.length)
    }
  }, [connections.length, onConnectionCountChange])

  const filteredConnections = useMemo(() => {
    let result = connections

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (conn) => {
          const fullName = `${conn.firstName} ${conn.lastName}`.toLowerCase()
          return fullName.includes(query) ||
            conn.headline.toLowerCase().includes(query)
        }
      )
    }

    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "name-asc":
          return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
        case "name-desc":
          return `${b.firstName} ${b.lastName}`.localeCompare(`${a.firstName} ${a.lastName}`)
        case "recent":
        default:
          return 0
      }
    })

    return result
  }, [searchQuery, connections, sortBy])

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1)
  }, [searchQuery, sortBy])

  const totalPages = Math.ceil(filteredConnections.length / perPage)
  const paginatedConnections = filteredConnections.slice((page - 1) * perPage, page * perPage)

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const selectAll = () => {
    setSelectedIds(new Set(filteredConnections.map(c => c.id)))
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
    setSelectionMode(false)
  }

  const openMessageDialog = (connection: Connection) => {
    if (selectionMode) {
      toggleSelection(connection.id)
    } else {
      setSelectedConnection(connection)
      setIsDialogOpen(true)
    }
  }

  const getSelectedConnections = () => {
    return filteredConnections.filter(c => selectedIds.has(c.id))
  }

  return (
    <div className={cn("space-y-6", selectionMode && "pb-20 md:pb-0")}>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Connections</h1>
          <p className="text-sm text-muted-foreground">
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Loading your network...
              </span>
            ) : (
              <span>{connections.length.toLocaleString()} connections in your network</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="shadow-sm h-9 w-9 shrink-0"
            title="Refresh connections"
          >
            <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
          </Button>
          {!selectionMode && (
            <Button variant="outline" onClick={() => setSelectionMode(true)} className="shadow-sm flex-1 sm:flex-initial">
              <CheckSquare className="w-4 h-4 mr-2" />
              Bulk Select
            </Button>
          )}
        </div>
        {selectionMode && (
          <Button variant="outline" size="sm" onClick={clearSelection} className="sm:hidden w-full">
            <X className="w-4 h-4 mr-1.5" />
            Cancel Selection
          </Button>
        )}
      </div>

      {/* Search and Sort */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or headline..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 bg-card shadow-sm"
          />
        </div>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="w-full sm:w-[180px] h-11 bg-card shadow-sm">
            <ArrowUpDown className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name-asc">Name (A-Z)</SelectItem>
            <SelectItem value="name-desc">Name (Z-A)</SelectItem>
            <SelectItem value="recent">Most Recent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Connections Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading connections...</p>
        </div>
      ) : filteredConnections.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-1">
            {searchQuery ? "No matches found" : "No connections yet"}
          </h3>
          <p className="text-muted-foreground text-center max-w-sm">
            {searchQuery
              ? "Try adjusting your search terms"
              : "Connect your LinkedIn account to see your network here"}
          </p>
        </div>
      ) : (
        <>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {paginatedConnections.map((connection, index) => (
            <Card
              key={`${connection.id}-${index}`}
              className={cn(
                "card-hover cursor-pointer group overflow-hidden",
                selectedIds.has(connection.id) && "ring-2 ring-primary shadow-md"
              )}
              onClick={() => openMessageDialog(connection)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {selectionMode && (
                    <Checkbox
                      checked={selectedIds.has(connection.id)}
                      onCheckedChange={() => toggleSelection(connection.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1"
                    />
                  )}
                  <Avatar className={cn(
                    "w-14 h-14 flex-shrink-0 ring-2 ring-transparent transition-all duration-200",
                    "group-hover:ring-primary/50"
                  )}>
                    <AvatarImage
                      src={connection.profilePicture ? `/api/proxy-image?url=${encodeURIComponent(connection.profilePicture)}` : undefined}
                      alt={`${connection.firstName} ${connection.lastName}`}
                    />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {connection.firstName.charAt(0)}
                      {connection.lastName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base truncate group-hover:text-primary transition-colors">
                      {connection.firstName} {connection.lastName}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed mt-0.5">
                      {connection.headline || "LinkedIn Member"}
                    </p>
                  </div>
                </div>
                {!selectionMode && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full mt-4 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-200 md:translate-y-1 md:group-hover:translate-y-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      openMessageDialog(connection)
                    }}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send Message
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="icon"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="h-9 w-9"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground px-2">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                className="h-9 w-9"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Mobile sticky bulk action bar */}
      {selectionMode && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{selectedIds.size} selected</span>
            <Button variant="outline" size="sm" onClick={selectAll}>
              All
            </Button>
          </div>
          <Button
            size="sm"
            disabled={selectedIds.size === 0}
            onClick={() => setIsBulkDialogOpen(true)}
          >
            <Send className="w-4 h-4 mr-1.5" />
            Message
          </Button>
        </div>
      )}

      {/* Desktop bulk action bar */}
      {selectionMode && (
        <div className="hidden md:flex items-center gap-2 sticky top-0 z-10 bg-background/80 backdrop-blur-sm py-2 -mt-2">
          <span className="text-sm text-muted-foreground font-medium">
            {selectedIds.size} selected
          </span>
          <Button variant="outline" size="sm" onClick={selectAll}>
            Select All
          </Button>
          <Button variant="outline" size="sm" onClick={clearSelection}>
            <X className="w-4 h-4 mr-1.5" />
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={selectedIds.size === 0}
            onClick={() => setIsBulkDialogOpen(true)}
            className="shadow-sm"
          >
            <Send className="w-4 h-4 mr-1.5" />
            Message ({selectedIds.size})
          </Button>
        </div>
      )}

      {/* Single message dialog */}
      <ConnectionMessageDialog
        connection={selectedConnection}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />

      {/* Bulk message dialog */}
      <BulkMessageDialog
        connections={getSelectedConnections()}
        open={isBulkDialogOpen}
        onOpenChange={setIsBulkDialogOpen}
        onComplete={() => {
          clearSelection()
          setIsBulkDialogOpen(false)
        }}
      />
    </div>
  )
}
