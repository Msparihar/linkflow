"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { apiFetch, errorMessage } from "@/lib/api-client"
import type { Profile, Sequence, SequenceDetail, Template } from "./shared"

const REFRESH_MS = 30_000

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: body === undefined ? undefined : JSON.stringify(body),
})

export function useSequences() {
  return useQuery({
    queryKey: ["sequences"],
    queryFn: async () => (await apiFetch<{ sequences?: Sequence[] }>("/api/sequences")).sequences || [],
    refetchInterval: (query) =>
      query.state.data?.some((sequence) => sequence.status === "active") ? REFRESH_MS : false,
  })
}

export function useSequence(id: string) {
  return useQuery({
    queryKey: ["sequence", id],
    queryFn: async () => (await apiFetch<{ sequence: SequenceDetail }>(`/api/sequences/${id}`)).sequence,
    refetchInterval: (query) => (query.state.data?.status === "active" ? REFRESH_MS : false),
  })
}

export function useTemplates() {
  return useQuery({
    queryKey: ["templates"],
    queryFn: async () => (await apiFetch<{ templates?: Template[] }>("/api/templates")).templates || [],
  })
}

export function useSequenceActions() {
  const queryClient = useQueryClient()
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["sequences"] })
    queryClient.invalidateQueries({ queryKey: ["sequence"] })
  }
  const onError = (error: unknown) => toast.error(errorMessage(error))

  const start = useMutation({
    mutationFn: (sequence: Sequence) => apiFetch(`/api/sequences/${sequence.id}/start`, json("POST")),
    onSuccess: (_data, sequence) => {
      refresh()
      toast.success(`"${sequence.name}" is running`, {
        description: "Invitations and follow-ups now go out by themselves.",
      })
    },
    onError,
  })

  const pause = useMutation({
    mutationFn: (sequence: Sequence) => apiFetch(`/api/sequences/${sequence.id}/pause`, json("POST")),
    onSuccess: (_data, sequence) => {
      refresh()
      toast(`"${sequence.name}" is paused`, { description: "Nothing more goes out until you resume it." })
    },
    onError,
  })

  const sendNow = useMutation({
    mutationFn: (sequence: Sequence) =>
      apiFetch<{ message?: string; sent?: number }>(`/api/sequences/${sequence.id}/execute`, json("POST")),
    onSuccess: (data) => {
      refresh()
      if (data.sent) toast.success(data.message || "Sent")
      else toast(data.message || "Nothing was ready to send.")
    },
    onError,
  })

  const remove = useMutation({
    mutationFn: (sequence: Sequence) => apiFetch(`/api/sequences/${sequence.id}`, json("DELETE")),
    onSuccess: (_data, sequence) => {
      refresh()
      toast(`"${sequence.name}" deleted`)
    },
    onError,
  })

  const duplicate = useMutation({
    mutationFn: (sequence: Sequence) =>
      apiFetch("/api/sequences", json("POST", {
        name: `${sequence.name} (copy)`,
        description: sequence.description,
        targetProfiles: [],
        steps: sequence.steps.map(({ type, templateId, customMessage, delayDays, delayHours, delayMinutes }) => ({
          type, templateId, customMessage, delayDays, delayHours, delayMinutes,
        })),
        dailyLimit: sequence.dailyLimit,
        delayMinMinutes: sequence.delayMinMinutes,
        delayMaxMinutes: sequence.delayMaxMinutes,
        sendFromHour: sequence.sendFromHour,
        sendUntilHour: sequence.sendUntilHour,
        sendWeekdaysOnly: sequence.sendWeekdaysOnly,
        timezone: sequence.timezone,
      })),
    onSuccess: () => {
      refresh()
      toast.success("Copied as a new draft", { description: "Same steps and pace, no people yet." })
    },
    onError,
  })

  const addPeople = useMutation({
    mutationFn: ({ sequence, profiles }: { sequence: Pick<Sequence, "id" | "name">; profiles: Profile[] }) =>
      apiFetch<{ added: number; alreadyThere: number }>(
        `/api/sequences/${sequence.id}/people`,
        json("POST", { profiles })
      ),
    onSuccess: (data, { sequence }) => {
      refresh()
      const skipped = data.alreadyThere ? ` ${data.alreadyThere} were already in it.` : ""
      toast.success(`Added ${data.added} to "${sequence.name}".${skipped}`)
    },
    onError,
  })

  const removePerson = useMutation({
    mutationFn: ({ sequenceId, personId }: { sequenceId: string; personId: string; name: string }) =>
      apiFetch(`/api/sequences/${sequenceId}/people/${personId}`, json("DELETE")),
    onSuccess: (_data, { name }) => {
      refresh()
      toast(`${name} removed from this sequence`)
    },
    onError,
  })

  const retryPerson = useMutation({
    mutationFn: ({ sequenceId, personId }: { sequenceId: string; personId: string; name: string }) =>
      apiFetch(`/api/sequences/${sequenceId}/people/${personId}/retry`, json("POST")),
    onSuccess: (_data, { name }) => {
      refresh()
      toast.success(`Trying ${name} again`)
    },
    onError,
  })

  return { start, pause, sendNow, remove, duplicate, addPeople, removePerson, retryPerson }
}
