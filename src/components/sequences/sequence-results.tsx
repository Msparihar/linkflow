"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  RotateCcw,
  Search,
  Send,
  UserMinus,
} from "lucide-react"
import { ErrorState } from "@/components/error-state"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SequenceFunnel, SequenceStatusLine, StageBadge, StartConfirm, StatusBadge } from "./sequence-bits"
import { SequenceEditor } from "./sequence-editor"
import { initials, proxied, type Sequence, type SequencePerson } from "./shared"
import { useSequence, useSequenceActions, useTemplates } from "./use-sequences"

const OPEN = ["pending", "in_progress", "paused"]

const FILTERS: Array<{ key: string; label: string; match: (person: SequencePerson) => boolean }> = [
  { key: "all", label: "Everyone", match: () => true },
  { key: "open", label: "In progress", match: (p) => OPEN.includes(p.status) },
  { key: "accepted", label: "Accepted", match: (p) => ["accepted", "messaged", "replied"].includes(p.stage) },
  { key: "replied", label: "Replied", match: (p) => p.stage === "replied" },
  { key: "failed", label: "Failed", match: (p) => p.stage === "failed" },
]

function when(value: string | null): string {
  if (!value) return ""
  return new Date(value).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })
}

export function SequenceResults({ id }: { id: string }) {
  const { data: sequence, isLoading, isError, error, refetch, isFetching } = useSequence(id)
  const { data: templates = [] } = useTemplates()
  const actions = useSequenceActions()

  const [filter, setFilter] = useState("all")
  const [query, setQuery] = useState("")
  const [editing, setEditing] = useState(false)
  const [starting, setStarting] = useState<Sequence | null>(null)

  const people = useMemo(() => sequence?.people ?? [], [sequence])
  const shown = useMemo(() => {
    const match = FILTERS.find((f) => f.key === filter)?.match ?? (() => true)
    const text = query.trim().toLowerCase()
    return people.filter(
      (person) =>
        match(person) &&
        (!text || person.name.toLowerCase().includes(text) || person.headline.toLowerCase().includes(text))
    )
  }, [people, filter, query])

  const back = (
    <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
      <Link href="/dashboard/sequences">
        <ArrowLeft className="size-4" />
        All sequences
      </Link>
    </Button>
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (isError || !sequence) {
    return (
      <div className="space-y-4">
        {back}
        <ErrorState title="Couldn't load this sequence" error={error} onRetry={() => refetch()} retrying={isFetching} />
      </div>
    )
  }

  const busy = actions.start.isPending || actions.pause.isPending || actions.sendNow.isPending
  const notStarted = sequence.totalTargets - people.length

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        {back}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 min-w-0">
            <h2 className="text-2xl font-bold truncate">{sequence.name}</h2>
            <StatusBadge status={sequence.status} />
          </div>
          <div className="flex flex-wrap gap-2">
            {sequence.status === "active" ? (
              <>
                <Button variant="outline" onClick={() => actions.sendNow.mutate(sequence)} disabled={busy}>
                  {actions.sendNow.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  Send the next few now
                </Button>
                <Button variant="outline" onClick={() => actions.pause.mutate(sequence)} disabled={busy}>
                  <Pause className="size-4" />
                  Pause
                </Button>
              </>
            ) : sequence.status !== "completed" || notStarted > 0 ? (
              <Button onClick={() => setStarting(sequence)} disabled={busy || sequence.totalTargets === 0}>
                <Play className="size-4" />
                {sequence.status === "paused" ? "Resume" : sequence.status === "completed" ? "Send to new people" : "Start"}
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="size-4" />
              Edit
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-5 space-y-4">
          <SequenceFunnel sequence={sequence} large />
          <SequenceStatusLine sequence={sequence} />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList className="flex-wrap h-auto">
            {FILTERS.map((item) => (
              <TabsTrigger key={item.key} value={item.key} className="gap-1.5">
                {item.label}
                <span className="text-xs text-muted-foreground tabular-nums">{people.filter(item.match).length}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative lg:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a person"
            className="pl-9 bg-card"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {shown.length === 0 ? (
            <p className="px-6 py-12 text-center text-sm text-muted-foreground">
              {people.length === 0
                ? "Nobody has been contacted yet. People appear here once the sequence starts."
                : "Nobody matches this filter."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Person</TableHead>
                  <TableHead>Where they are</TableHead>
                  <TableHead className="hidden md:table-cell">What happens next</TableHead>
                  <TableHead className="hidden lg:table-cell">Last activity</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.map((person) => (
                  <TableRow key={person.id}>
                    <TableCell className="pl-5">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="size-9">
                          <AvatarImage src={proxied(person.profilePicture)} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {initials(person.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium truncate max-w-56">{person.name}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-56">{person.headline}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StageBadge stage={person.stage} />
                    </TableCell>
                    <TableCell className="hidden md:table-cell max-w-72 whitespace-normal">
                      {person.error ? (
                        <span className="text-sm text-destructive">{person.error}</span>
                      ) : person.next ? (
                        <span className="text-sm text-muted-foreground">
                          {person.next}
                          {person.nextActionAt && new Date(person.nextActionAt) > new Date() && person.status !== "paused"
                            ? person.next.startsWith("Waiting for them")
                              ? ` · next check ${when(person.nextActionAt)}`
                              : ` · ${when(person.nextActionAt)}`
                            : ""}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Nothing more</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {when(person.lastActivityAt)}
                    </TableCell>
                    <TableCell className="pr-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" aria-label={`Actions for ${person.name}`}>
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {person.chatId && (
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/chats?chat=${person.chatId}`}>
                                <MessageSquare />
                                Open conversation
                              </Link>
                            </DropdownMenuItem>
                          )}
                          {person.publicIdentifier && (
                            <DropdownMenuItem asChild>
                              <a
                                href={`https://www.linkedin.com/in/${person.publicIdentifier}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <ExternalLink />
                                View on LinkedIn
                              </a>
                            </DropdownMenuItem>
                          )}
                          {person.stage === "failed" && (
                            <DropdownMenuItem
                              onSelect={() =>
                                actions.retryPerson.mutate({ sequenceId: id, personId: person.id, name: person.name })
                              }
                            >
                              <RotateCcw />
                              Try again
                            </DropdownMenuItem>
                          )}
                          {(person.chatId || person.publicIdentifier || person.stage === "failed") && (
                            <DropdownMenuSeparator />
                          )}
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() =>
                              actions.removePerson.mutate({ sequenceId: id, personId: person.id, name: person.name })
                            }
                          >
                            <UserMinus />
                            Remove from sequence
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {notStarted > 0 && people.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {notStarted} more {notStarted === 1 ? "person is" : "people are"} on the list and will join when you press Start.
        </p>
      )}

      {editing && (
        <SequenceEditor sequence={sequence} templates={templates} onClose={() => setEditing(false)} />
      )}

      <StartConfirm
        sequence={starting}
        onCancel={() => setStarting(null)}
        onConfirm={(target) => {
          actions.start.mutate(target)
          setStarting(null)
        }}
      />
    </div>
  )
}
