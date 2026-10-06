"use client"

import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { Loader2, MapPin, Search } from "lucide-react"
import { apiFetch, errorMessage } from "@/lib/api-client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { initials, type Profile } from "./shared"

interface PeoplePickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  alreadyAdded: Set<string>
  onAdd: (profiles: Profile[]) => void
}

interface SearchPage {
  profiles?: Profile[]
  cursor?: string | null
}

export function PeoplePicker({ open, onOpenChange, alreadyAdded, onAdd }: PeoplePickerProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Profile[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [searched, setSearched] = useState(false)

  const search = useMutation({
    onError: () => {},
    mutationFn: ({ text, next }: { text: string; next?: string | null }) =>
      apiFetch<SearchPage>(
        `/api/linkedin/search?q=${encodeURIComponent(text)}&limit=50${next ? `&cursor=${encodeURIComponent(next)}` : ""}`
      ),
    onSuccess: (data, { next }) => {
      const found = data.profiles || []
      setResults((current) => {
        if (!next) return found
        const seen = new Set(current.map((p) => p.id))
        return [...current, ...found.filter((p) => !seen.has(p.id))]
      })
      setCursor(data.cursor || null)
      setSearched(true)
    },
  })

  const runSearch = () => {
    const text = query.trim()
    if (text.length < 2) return
    setChecked(new Set())
    search.mutate({ text })
  }

  const selectable = results.filter((p) => !alreadyAdded.has(p.id))
  const allChecked = selectable.length > 0 && selectable.every((p) => checked.has(p.id))

  const toggle = (id: string) =>
    setChecked((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const toggleAll = () =>
    setChecked(allChecked ? new Set() : new Set(selectable.map((p) => p.id)))

  const add = () => {
    onAdd(results.filter((p) => checked.has(p.id)))
    setChecked(new Set())
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Find people on LinkedIn</DialogTitle>
          <DialogDescription>Search, tick the people you want, and add them in one go.</DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
              placeholder="Name, job title or company"
              className="pl-9"
            />
          </div>
          <Button onClick={runSearch} disabled={search.isPending || query.trim().length < 2}>
            {search.isPending && !results.length ? <Loader2 className="size-4 animate-spin" /> : "Search"}
          </Button>
        </div>

        {results.length > 0 && (
          <label className="flex items-center gap-3 px-3 text-sm text-muted-foreground">
            <Checkbox checked={allChecked} onCheckedChange={toggleAll} />
            Select all {selectable.length} shown
          </label>
        )}

        <ScrollArea className="h-80 rounded-md border">
          {search.isError ? (
            <p className="p-6 text-sm text-destructive text-center">{errorMessage(search.error)}</p>
          ) : results.length === 0 ? (
            <div className="flex h-80 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
              <Search className="size-8" />
              {searched ? "Nobody matched that search." : "Search to see people here."}
            </div>
          ) : (
            <ul className="divide-y">
              {results.map((profile) => {
                const added = alreadyAdded.has(profile.id)
                const name = `${profile.firstName} ${profile.lastName}`.trim()
                return (
                  <li key={profile.id}>
                    <label className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 aria-disabled:opacity-60" aria-disabled={added}>
                      <Checkbox
                        checked={added || checked.has(profile.id)}
                        disabled={added}
                        onCheckedChange={() => toggle(profile.id)}
                      />
                      <Avatar className="size-9">
                        <AvatarImage src={profile.profilePicture || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">{initials(name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 text-sm font-medium">
                          <span className="truncate">{name}</span>
                          {profile.connectionDegree === 1 && <Badge variant="secondary">Connected</Badge>}
                          {added && <Badge variant="outline">In this sequence</Badge>}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{profile.headline}</p>
                      </div>
                      {profile.location && (
                        <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground shrink-0 max-w-40">
                          <MapPin className="size-3 shrink-0" />
                          <span className="truncate">{profile.location}</span>
                        </span>
                      )}
                    </label>
                  </li>
                )
              })}
              {cursor && (
                <li className="p-3 text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={search.isPending}
                    onClick={() => search.mutate({ text: query.trim(), next: cursor })}
                  >
                    {search.isPending ? <Loader2 className="size-4 animate-spin" /> : "Show more people"}
                  </Button>
                </li>
              )}
            </ul>
          )}
        </ScrollArea>

        <DialogFooter className="sm:justify-between sm:items-center">
          <p className="text-sm text-muted-foreground">
            {checked.size > 0 ? `${checked.size} selected` : "People already connected skip the invitation step."}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Done</Button>
            <Button onClick={add} disabled={checked.size === 0}>
              Add {checked.size || ""} {checked.size === 1 ? "person" : "people"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
