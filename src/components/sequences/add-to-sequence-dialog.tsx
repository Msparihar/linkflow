"use client"

import { useState } from "react"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { StatusBadge } from "./sequence-bits"
import type { Profile } from "./shared"
import { useSequenceActions, useSequences } from "./use-sequences"

interface AddToSequenceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  profiles: Profile[]
  onAdded?: () => void
}

export function AddToSequenceDialog({ open, onOpenChange, profiles, onAdded }: AddToSequenceDialogProps) {
  const { data: sequences = [], isLoading } = useSequences()
  const { addPeople } = useSequenceActions()
  const [chosen, setChosen] = useState("")

  const sequence = sequences.find((s) => s.id === chosen)
  const count = profiles.length

  const add = () => {
    if (!sequence) return
    addPeople.mutate(
      { sequence, profiles },
      {
        onSuccess: () => {
          onOpenChange(false)
          setChosen("")
          onAdded?.()
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Add {count} {count === 1 ? "person" : "people"} to a sequence
          </DialogTitle>
          <DialogDescription>
            In a running sequence they start right away. In a draft they wait until you press Start.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : sequences.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            You have no sequences yet.{" "}
            <Link href="/dashboard/sequences" className="text-primary underline underline-offset-2">
              Create one first
            </Link>
            .
          </p>
        ) : (
          <RadioGroup value={chosen} onValueChange={setChosen} className="max-h-72 overflow-y-auto gap-2">
            {sequences.map((item) => (
              <Label
                key={item.id}
                htmlFor={`sequence-${item.id}`}
                className="flex items-center gap-3 rounded-lg border px-3 py-2.5 font-normal hover:bg-muted/50 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent"
              >
                <RadioGroupItem id={`sequence-${item.id}`} value={item.id} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{item.name}</span>
                  <span className="block text-xs text-muted-foreground">{item.totalTargets} people</span>
                </span>
                <StatusBadge status={item.status} />
              </Label>
            ))}
          </RadioGroup>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={add} disabled={!sequence || addPeople.isPending}>
            {addPeople.isPending && <Loader2 className="size-4 animate-spin" />}
            Add to sequence
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
