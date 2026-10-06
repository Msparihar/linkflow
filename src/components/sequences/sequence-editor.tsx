"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  ChevronDown,
  Loader2,
  MessageSquare,
  Plus,
  Search,
  Trash2,
  Upload,
  UserPlus,
  X,
} from "lucide-react"
import { apiFetch, errorMessage } from "@/lib/api-client"
import { applyTemplate, fitInviteNote, INVITE_NOTE_MAX, PLACEHOLDERS } from "@/lib/sequence-text"
import { CSVImportDialog } from "@/components/csv-import-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"
import { PeoplePicker } from "./people-picker"
import {
  hourLabel,
  initials,
  newStepKey,
  PACES,
  paceOf,
  proxied,
  stepText,
  timingLabel,
  toApiSteps,
  toTimeline,
  type PaceKey,
  type Profile,
  type Sequence,
  type Template,
  type TimelineStep,
} from "./shared"

const SAMPLE_PERSON: Profile = {
  id: "sample",
  firstName: "Alex",
  lastName: "Morgan",
  headline: "Head of Growth at Northwind",
  location: "London",
}

const NEW_TIMELINE = (): TimelineStep[] => [
  {
    key: newStepKey(),
    type: "invite",
    message: "Hi {{firstName}}, I came across your profile and would like to connect.",
    delayDays: 0,
    delayHours: 0,
    delayMinutes: 0,
    hasWait: false,
  },
  {
    key: newStepKey(),
    type: "message",
    message: "Thanks for connecting, {{firstName}}.",
    delayDays: 1,
    delayHours: 0,
    delayMinutes: 0,
    hasWait: true,
  },
]

interface SequenceEditorProps {
  sequence: Sequence | null
  templates: Template[]
  onClose: () => void
}

export function SequenceEditor({ sequence, templates, onClose }: SequenceEditorProps) {
  const queryClient = useQueryClient()
  const locked = (sequence?.executionCount ?? 0) > 0

  const [name, setName] = useState(sequence?.name ?? "")
  const [description, setDescription] = useState(sequence?.description ?? "")
  const [people, setPeople] = useState<Profile[]>(sequence?.targetProfiles ?? [])
  const [timeline, setTimeline] = useState<TimelineStep[]>(() =>
    sequence && sequence.steps.length > 0 ? toTimeline(sequence.steps) : NEW_TIMELINE()
  )
  const [dailyLimit, setDailyLimit] = useState(sequence?.dailyLimit ?? PACES.normal.dailyLimit)
  const [gapMin, setGapMin] = useState(sequence?.delayMinMinutes ?? PACES.normal.min)
  const [gapMax, setGapMax] = useState(sequence?.delayMaxMinutes ?? PACES.normal.max)
  const [setHours, setSetHours] = useState(
    sequence ? sequence.sendFromHour > 0 || sequence.sendUntilHour < 24 || sequence.sendWeekdaysOnly : true
  )
  const [fromHour, setFromHour] = useState(sequence && sequence.sendUntilHour < 24 ? sequence.sendFromHour : 9)
  const [untilHour, setUntilHour] = useState(sequence && sequence.sendUntilHour < 24 ? sequence.sendUntilHour : 18)
  const [weekdaysOnly, setWeekdaysOnly] = useState(sequence ? sequence.sendWeekdaysOnly : true)
  const [previewId, setPreviewId] = useState<string>("")
  const [showSearch, setShowSearch] = useState(false)
  const [showCsv, setShowCsv] = useState(false)

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
  const pace = paceOf({ dailyLimit, delayMinMinutes: gapMin, delayMaxMinutes: gapMax })
  const previewPerson = people.find((p) => p.id === previewId) || people[0] || SAMPLE_PERSON

  const save = useMutation({
    mutationFn: () =>
      apiFetch(sequence ? `/api/sequences/${sequence.id}` : "/api/sequences", {
        method: sequence ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          targetProfiles: people,
          steps: toApiSteps(timeline, locked),
          dailyLimit,
          delayMinMinutes: Math.min(gapMin, gapMax),
          delayMaxMinutes: Math.max(gapMin, gapMax),
          sendFromHour: setHours ? fromHour : 0,
          sendUntilHour: setHours ? untilHour : 24,
          sendWeekdaysOnly: setHours && weekdaysOnly,
          timezone,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sequences"] })
      queryClient.invalidateQueries({ queryKey: ["sequence"] })
      toast.success(sequence ? "Changes saved" : "Draft created", {
        description: sequence ? undefined : "Nothing is sent until you press Start.",
      })
      onClose()
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const updateStep = (key: string, changes: Partial<TimelineStep>) =>
    setTimeline((steps) => steps.map((step) => (step.key === key ? { ...step, ...changes } : step)))

  const addPeople = (profiles: Profile[]) =>
    setPeople((current) => {
      const seen = new Set(current.map((p) => p.id))
      return [...current, ...profiles.filter((p) => !seen.has(p.id))]
    })

  const problem = !name.trim()
    ? "Give the sequence a name."
    : timeline.some((step) => step.type === "invite" && stepText(step, templates).length > INVITE_NOTE_MAX)
      ? `An invitation note is over ${INVITE_NOTE_MAX} characters.`
      : timeline.some((step) => step.type === "message" && !stepText(step, templates).trim())
        ? "A message step is empty."
        : setHours && untilHour <= fromHour
          ? "Sending hours must end after they start."
          : null

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-6xl h-[92vh] p-0 gap-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle>{sequence ? "Edit sequence" : "New sequence"}</DialogTitle>
          <DialogDescription>
            {locked
              ? "This sequence has started. You can change wording, timing, pace and people, but not add or remove steps."
              : "Choose who to reach, what they get and when. Nothing is sent until you press Start."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 grid lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="overflow-y-auto px-6 py-5 space-y-8">
            <section className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="sequence-name">Name</Label>
                <Input
                  id="sequence-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Founders in Bangalore"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sequence-note">Note to self (optional)</Label>
                <Input
                  id="sequence-note"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Why you're reaching out"
                />
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">
                  People <span className="font-normal text-muted-foreground">({people.length})</span>
                </h3>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setShowCsv(true)}>
                    <Upload className="size-4" />
                    Import CSV
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowSearch(true)}>
                    <Search className="size-4" />
                    Find on LinkedIn
                  </Button>
                </div>
              </div>

              {people.length === 0 ? (
                <button
                  type="button"
                  onClick={() => setShowSearch(true)}
                  className="w-full rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground hover:bg-muted/50"
                >
                  Nobody yet. Find people on LinkedIn, or add them later from Search and Connections.
                </button>
              ) : (
                <div className="max-h-44 overflow-y-auto rounded-lg border bg-card">
                  <ul className="divide-y">
                    {people.map((person) => {
                      const fullName = `${person.firstName} ${person.lastName}`.trim()
                      return (
                        <li key={person.id} className="flex items-center gap-3 px-3 py-2">
                          <Avatar className="size-7">
                            <AvatarImage src={proxied(person.profilePicture)} />
                            <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                              {initials(fullName)}
                            </AvatarFallback>
                          </Avatar>
                          <p className="min-w-0 flex-1 truncate text-sm">
                            <span className="font-medium">{fullName}</span>
                            {person.headline && <span className="text-muted-foreground"> · {person.headline}</span>}
                          </p>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7 shrink-0"
                            aria-label={`Remove ${fullName}`}
                            onClick={() => setPeople((current) => current.filter((p) => p.id !== person.id))}
                          >
                            <X className="size-4" />
                          </Button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Steps</h3>
              <ol>
                {timeline.map((step, index) => (
                  <TimelineItem
                    key={step.key}
                    step={step}
                    index={index}
                    timeline={timeline}
                    templates={templates}
                    locked={locked}
                    last={index === timeline.length - 1}
                    onChange={(changes) => updateStep(step.key, changes)}
                    onRemove={() => setTimeline((steps) => steps.filter((s) => s.key !== step.key))}
                  />
                ))}
              </ol>
              {!locked && (
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-11"
                  onClick={() =>
                    setTimeline((steps) => [
                      ...steps,
                      { key: newStepKey(), type: "message", message: "", delayDays: 3, delayHours: 0, delayMinutes: 0, hasWait: true },
                    ])
                  }
                >
                  <Plus className="size-4" />
                  Add a follow-up message
                </Button>
              )}
            </section>

            <section className="space-y-4">
              <h3 className="text-sm font-semibold">Pace</h3>
              <div className="space-y-2">
                <ToggleGroup
                  type="single"
                  variant="outline"
                  value={pace === "custom" ? "" : pace}
                  onValueChange={(value) => {
                    if (!value) return
                    const preset = PACES[value as PaceKey]
                    setDailyLimit(preset.dailyLimit)
                    setGapMin(preset.min)
                    setGapMax(preset.max)
                  }}
                >
                  {(Object.keys(PACES) as PaceKey[]).map((key) => (
                    <ToggleGroupItem key={key} value={key} className="px-5">
                      {PACES[key].label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
                <p className="text-sm text-muted-foreground">
                  {pace === "custom"
                    ? `Your own pace: up to ${dailyLimit} a day, ${Math.min(gapMin, gapMax)} to ${Math.max(gapMin, gapMax)} minutes apart.`
                    : PACES[pace].hint}
                </p>
                <Collapsible>
                  <CollapsibleTrigger className="group flex items-center gap-1 text-sm text-primary">
                    Set exact numbers
                    <ChevronDown className="size-4 transition-transform group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="grid grid-cols-3 gap-3 pt-3">
                    <NumberField label="Most per 24 hours" value={dailyLimit} min={1} max={100} onChange={setDailyLimit} />
                    <NumberField label="Shortest gap (min)" value={gapMin} min={1} max={120} onChange={setGapMin} />
                    <NumberField label="Longest gap (min)" value={gapMax} min={1} max={240} onChange={setGapMax} />
                  </CollapsibleContent>
                </Collapsible>
              </div>

              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Label htmlFor="set-hours">Only send during set hours</Label>
                    <p className="text-sm text-muted-foreground">
                      {setHours ? `Times are in ${timezone.replace(/_/g, " ")}.` : "Messages can go out at any hour, including at night."}
                    </p>
                  </div>
                  <Switch id="set-hours" checked={setHours} onCheckedChange={setSetHours} />
                </div>
                {setHours && (
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="text-muted-foreground">From</span>
                    <HourSelect value={fromHour} onChange={setFromHour} hours={range(0, 23)} />
                    <span className="text-muted-foreground">until</span>
                    <HourSelect value={untilHour} onChange={setUntilHour} hours={range(1, 24)} />
                    <label className="flex items-center gap-2 ml-auto">
                      <Switch checked={weekdaysOnly} onCheckedChange={setWeekdaysOnly} />
                      Weekdays only
                    </label>
                  </div>
                )}
              </div>
            </section>
          </div>

          <aside className="hidden lg:flex flex-col min-h-0 border-l bg-muted/40">
            <div className="px-5 py-4 border-b space-y-2 shrink-0">
              <h3 className="text-sm font-semibold">What they receive</h3>
              <Select value={previewPerson.id} onValueChange={setPreviewId} disabled={people.length === 0}>
                <SelectTrigger className="w-full bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(people.length ? people.slice(0, 100) : [SAMPLE_PERSON]).map((person) => (
                    <SelectItem key={person.id} value={person.id}>
                      {person.firstName} {person.lastName}
                      {person.id === "sample" && " (example)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {timeline.map((step, index) => (
                <PreviewStep
                  key={step.key}
                  step={step}
                  caption={timingLabel(timeline, index)}
                  text={applyTemplate(stepText(step, templates), previewPerson)}
                  person={previewPerson}
                />
              ))}
            </div>
          </aside>
        </div>

        <div className="flex items-center justify-between gap-4 px-6 py-3 border-t shrink-0">
          <p className="text-sm text-destructive">{problem}</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || !!problem}>
              {save.isPending && <Loader2 className="size-4 animate-spin" />}
              {sequence ? "Save changes" : "Save as draft"}
            </Button>
          </div>
        </div>

        <PeoplePicker
          open={showSearch}
          onOpenChange={setShowSearch}
          alreadyAdded={new Set(people.map((p) => p.id))}
          onAdd={addPeople}
        />
        <CSVImportDialog
          open={showCsv}
          onOpenChange={setShowCsv}
          onImportComplete={(profiles) => {
            addPeople(profiles as Profile[])
            setShowCsv(false)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i)

function HourSelect({ value, onChange, hours }: { value: number; onChange: (hour: number) => void; hours: number[] }) {
  return (
    <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger className="w-28">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {hours.map((hour) => (
          <SelectItem key={hour} value={String(hour)}>
            {hourLabel(hour)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function NumberField(props: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{props.label}</Label>
      <Input
        type="number"
        min={props.min}
        max={props.max}
        value={props.value}
        onChange={(e) =>
          props.onChange(Math.max(props.min, Math.min(props.max, parseInt(e.target.value) || props.min)))
        }
      />
    </div>
  )
}

interface TimelineItemProps {
  step: TimelineStep
  index: number
  timeline: TimelineStep[]
  templates: Template[]
  locked: boolean
  last: boolean
  onChange: (changes: Partial<TimelineStep>) => void
  onRemove: () => void
}

function TimelineItem({ step, index, timeline, templates, locked, last, onChange, onRemove }: TimelineItemProps) {
  const template = templates.find((t) => t.id === step.templateId)
  const text = stepText(step, templates)
  const afterInvite = index > 0 && timeline[index - 1].type === "invite"
  const canTime = index > 0 && (step.hasWait || !locked)
  const inHours = step.delayDays === 0
  const amount = inHours ? step.delayHours : step.delayDays + (step.delayHours ? 1 : 0)
  const Icon = step.type === "invite" ? UserPlus : MessageSquare

  const setDelay = (value: number, unit: string) =>
    onChange(
      unit === "hours"
        ? { delayDays: 0, delayHours: value, delayMinutes: 0 }
        : { delayDays: value, delayHours: 0, delayMinutes: 0 }
    )

  return (
    <li className="relative pl-11 pb-5">
      {!last && <span className="absolute left-4 top-9 bottom-0 w-px bg-border" />}
      <span className="absolute left-0 top-0 flex size-8 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <Icon className="size-4" />
      </span>

      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {index === 0 && !locked ? (
            <Select value={step.type} onValueChange={(type) => onChange({ type: type as TimelineStep["type"] })}>
              <SelectTrigger className="w-auto font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="invite">Invitation to connect</SelectItem>
                <SelectItem value="message">Message (people already connected)</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <span className="text-sm font-medium">
              {step.type === "invite" ? "Invitation to connect" : index === 0 ? "Message" : "Follow-up message"}
            </span>
          )}

          {index === 0 ? (
            <span className="text-sm text-muted-foreground">Sent as soon as the sequence starts</span>
          ) : canTime ? (
            <span className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              Send
              <Input
                type="number"
                min={0}
                max={inHours ? 23 : 60}
                value={amount}
                onChange={(e) => setDelay(Math.max(0, parseInt(e.target.value) || 0), inHours ? "hours" : "days")}
                className="h-8 w-16"
                aria-label="Delay"
              />
              <Select value={inHours ? "hours" : "days"} onValueChange={(unit) => setDelay(amount || 1, unit)}>
                <SelectTrigger className="h-8 w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="days">days</SelectItem>
                  <SelectItem value="hours">hours</SelectItem>
                </SelectContent>
              </Select>
              {afterInvite ? "after they accept" : "later, if they haven't replied"}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">{timingLabel(timeline, index)}</span>
          )}

          {!locked && timeline.length > 1 && (
            <Button size="icon" variant="ghost" className="ml-auto size-8" aria-label="Remove step" onClick={onRemove}>
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>

        <Select
          value={step.templateId || "own"}
          onValueChange={(value) => onChange({ templateId: value === "own" ? undefined : value })}
        >
          <SelectTrigger className="w-full sm:w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="own">Write my own</SelectItem>
            {templates.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                Template: {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {template ? (
          <div className="rounded-md bg-muted px-3 py-2 text-sm whitespace-pre-wrap">
            {template.content}
            <div className="mt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onChange({ templateId: undefined, message: template.content })}
              >
                Edit a copy for this step
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Textarea
              value={step.message}
              onChange={(e) => onChange({ message: e.target.value })}
              rows={step.type === "invite" ? 3 : 4}
              placeholder={
                step.type === "invite"
                  ? "Optional note sent with the invitation"
                  : "What you want to say once they've accepted"
              }
            />
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground mr-1">Insert</span>
              {PLACEHOLDERS.map((placeholder) => (
                <button
                  key={placeholder.token}
                  type="button"
                  onClick={() => onChange({ message: `${step.message}${placeholder.token}` })}
                  className="rounded-md border bg-background px-2 py-0.5 text-xs hover:bg-accent hover:text-accent-foreground"
                >
                  {placeholder.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {step.type === "invite" && (
          <p className={cn("text-xs", text.length > INVITE_NOTE_MAX ? "text-destructive" : "text-muted-foreground")}>
            {text.length} of {INVITE_NOTE_MAX} characters before names are filled in.
          </p>
        )}
      </div>
    </li>
  )
}

function PreviewStep(props: { step: TimelineStep; caption: string; text: string; person: Profile }) {
  const { step, caption, text, person } = props
  const tooLong = step.type === "invite" && text.length > INVITE_NOTE_MAX
  const shown = tooLong ? fitInviteNote(text) : text

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground">
        {step.type === "invite" ? "Invitation" : "Message"} · {caption}
      </p>
      {shown.trim() ? (
        <div className="rounded-2xl rounded-tl-sm bg-card border px-3.5 py-2.5 text-sm whitespace-pre-wrap shadow-xs">
          {shown}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
          {step.type === "invite" ? "No note. They get a plain connection request." : "Nothing written yet."}
        </p>
      )}
      {step.type === "invite" && shown.trim() && (
        <p className={cn("text-xs", tooLong ? "text-[var(--chart-3)]" : "text-muted-foreground")}>
          {tooLong
            ? `Too long for ${person.firstName} once filled in (${text.length}). It will be sent shortened, as shown.`
            : `${text.length} of ${INVITE_NOTE_MAX} characters for ${person.firstName}`}
        </p>
      )}
    </div>
  )
}
