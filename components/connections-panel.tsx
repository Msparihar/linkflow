"use client"

import { useState, useEffect, useRef } from "react"
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
  X
} from "lucide-react"
import { ConnectionMessageDialog } from "@/components/connection-message-dialog"
import { BulkMessageDialog } from "@/components/bulk-message-dialog"

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
  const [connections, setConnections] = useState<Connection[]>([])
  const [allConnections, setAllConnections] = useState<Connection[]>([])
  const [filteredConnections, setFilteredConnections] = useState<Connection[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadingAll, setLoadingAll] = useState(false)
  const [allLoaded, setAllLoaded] = useState(false)
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [sortBy, setSortBy] = useState<SortOption>("name-asc")
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Bulk selection state
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false)

  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    fetchConnections()
    fetchAllConnectionsInBackground()
  }, [])

  useEffect(() => {
    const connectionsToSearch = allLoaded ? allConnections : connections
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

    setFilteredConnections(result)
  }, [searchQuery, connections, allConnections, allLoaded, sortBy])

  // Intersection observer for infinite scroll
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect()

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !searchQuery) {
          loadMoreConnections()
        }
      },
      { threshold: 0.1 }
    )

    if (loadMoreRef.current) observerRef.current.observe(loadMoreRef.current)

    return () => observerRef.current?.disconnect()
  }, [hasMore, loadingMore, cursor, searchQuery])

  const fetchConnections = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/linkedin/connections?limit=20")
      if (res.ok) {
        const data = await res.json()
        setConnections(data.connections || [])
        setCursor(data.cursor || null)
        setHasMore(!!data.cursor)
      }
    } catch (error) {
      console.error("Failed to fetch connections:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadMoreConnections = async () => {
    if (!cursor || loadingMore) return

    setLoadingMore(true)
    try {
      const res = await fetch(`/api/linkedin/connections?limit=20&cursor=${encodeURIComponent(cursor)}`)
      if (res.ok) {
        const data = await res.json()
        setConnections(prev => [...prev, ...(data.connections || [])])
        setCursor(data.cursor || null)
        setHasMore(!!data.cursor)
      }
    } catch (error) {
      console.error("Failed to load more:", error)
    } finally {
      setLoadingMore(false)
    }
  }

  const fetchAllConnectionsInBackground = async () => {
    setLoadingAll(true)
    try {
      const res = await fetch("/api/linkedin/connections?fetchAll=true")
      if (res.ok) {
        const data = await res.json()
        setAllConnections(data.connections || [])
        setAllLoaded(true)
        onConnectionCountChange?.(data.connections?.length || 0)
      }
    } catch (error) {
      console.error("Failed to fetch all:", error)
    } finally {
      setLoadingAll(false)
    }
  }

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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Connections</h2>
          <p className="text-sm text-muted-foreground">
            {loadingAll ? (
              <span className="flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Loading...
              </span>
            ) : (
              `${allConnections.length} connections`
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectionMode ? (
            <>
              <span className="text-sm text-muted-foreground">
                {selectedIds.size} selected
              </span>
              <Button variant="outline" size="sm" onClick={selectAll}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={clearSelection}>
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={selectedIds.size === 0}
                onClick={() => setIsBulkDialogOpen(true)}
              >
                <Send className="w-4 h-4 mr-1" />
                Message ({selectedIds.size})
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setSelectionMode(true)}>
              <CheckSquare className="w-4 h-4 mr-2" />
              Bulk Select
            </Button>
          )}
        </div>
      </div>

      {/* Search and Sort */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search connections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="w-[180px]">
            <ArrowUpDown className="w-4 h-4 mr-2" />
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
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredConnections.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Users className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            {searchQuery ? "No connections found" : "No connections"}
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredConnections.map((connection, index) => (
              <Card
                key={`${connection.id}-${index}`}
                className={`hover:shadow-md transition-all cursor-pointer group ${
                  selectedIds.has(connection.id) ? "ring-2 ring-primary" : ""
                }`}
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
                    <Avatar className="w-12 h-12 flex-shrink-0">
                      <AvatarImage
                        src={connection.profilePicture || "/placeholder.svg"}
                        alt={`${connection.firstName} ${connection.lastName}`}
                      />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {connection.firstName.charAt(0)}
                        {connection.lastName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">
                        {connection.firstName} {connection.lastName}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {connection.headline}
                      </p>
                    </div>
                  </div>
                  {!selectionMode && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full mt-3 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation()
                        openMessageDialog(connection)
                      }}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Message
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Load more */}
          {!searchQuery && hasMore && (
            <div ref={loadMoreRef} className="flex justify-center py-8">
              {loadingMore ? (
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              ) : (
                <Button variant="outline" onClick={loadMoreConnections}>
                  Load More
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
