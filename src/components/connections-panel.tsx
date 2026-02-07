"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useInfiniteQuery, useQuery } from "@tanstack/react-query"
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
  UserPlus
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
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Bulk selection state
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false)

  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  // Paginated connections for infinite scroll
  const {
    data: paginatedData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ["connections"],
    queryFn: async ({ pageParam }: { pageParam: string | null }) => {
      const params = new URLSearchParams({ limit: "20" })
      if (pageParam) params.set("cursor", pageParam)
      const res = await fetch(`/api/linkedin/connections?${params}`)
      if (!res.ok) throw new Error("Failed to fetch connections")
      return res.json() as Promise<{ connections: Connection[]; cursor?: string }>
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.cursor || undefined,
  })

  // Background fetch of all connections
  const { data: allConnectionsData, isLoading: loadingAll } = useQuery({
    queryKey: ["connections-all"],
    queryFn: async () => {
      const res = await fetch("/api/linkedin/connections?fetchAll=true")
      if (!res.ok) throw new Error("Failed to fetch all connections")
      const data = await res.json()
      return (data.connections || []) as Connection[]
    },
  })

  const allConnections = allConnectionsData || []
  const paginatedConnections = useMemo(
    () => paginatedData?.pages.flatMap(p => p.connections) || [],
    [paginatedData]
  )

  // Report count when all connections load
  useEffect(() => {
    if (allConnections.length > 0) {
      onConnectionCountChange?.(allConnections.length)
    }
  }, [allConnections.length, onConnectionCountChange])

  const allLoaded = !!allConnectionsData

  const filteredConnections = useMemo(() => {
    const connectionsToSearch = allLoaded ? allConnections : paginatedConnections
    let result = connectionsToSearch

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (conn) =>
          conn.firstName.toLowerCase().includes(query) ||
          conn.lastName.toLowerCase().includes(query) ||
          conn.headline.toLowerCase().includes(query)
      )
    }

    // Apply sorting
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "name-asc":
          return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
        case "name-desc":
          return `${b.firstName} ${b.lastName}`.localeCompare(`${a.firstName} ${a.lastName}`)
        case "recent":
        default:
          return 0 // Keep original order (most recent first from API)
      }
    })

    return result
  }, [searchQuery, paginatedConnections, allConnections, allLoaded, sortBy])

  // Intersection observer for infinite scroll
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect()

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage && !searchQuery) {
          fetchNextPage()
        }
      },
      { threshold: 0.1 }
    )

    if (loadMoreRef.current) observerRef.current.observe(loadMoreRef.current)

    return () => observerRef.current?.disconnect()
  }, [hasNextPage, isFetchingNextPage, searchQuery, fetchNextPage])

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Connections</h1>
          <p className="text-sm text-muted-foreground">
            {loadingAll ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Loading your network...
              </span>
            ) : (
              <span>{allConnections.length.toLocaleString()} connections in your network</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectionMode ? (
            <>
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
            </>
          ) : (
            <Button variant="outline" onClick={() => setSelectionMode(true)} className="shadow-sm">
              <CheckSquare className="w-4 h-4 mr-2" />
              Bulk Select
            </Button>
          )}
        </div>
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
            {filteredConnections.map((connection, index) => (
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
                        src={connection.profilePicture || "/placeholder.svg"}
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
                      className="w-full mt-4 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0"
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

          {/* Load more */}
          {!searchQuery && hasNextPage && (
            <div ref={loadMoreRef} className="flex justify-center py-8">
              {isFetchingNextPage ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Loading more...</span>
                </div>
              ) : (
                <Button variant="outline" onClick={() => fetchNextPage()} className="shadow-sm">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Load More Connections
                </Button>
              )}
            </div>
          )}
        </>
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
