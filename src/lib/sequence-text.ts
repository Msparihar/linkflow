export const INVITE_NOTE_MAX = 300

export const PLACEHOLDERS = [
  { token: "{{firstName}}", label: "First name" },
  { token: "{{lastName}}", label: "Last name" },
  { token: "{{fullName}}", label: "Full name" },
  { token: "{{headline}}", label: "Headline" },
  { token: "{{location}}", label: "Location" },
]

interface TemplateProfile {
  firstName?: string
  lastName?: string
  headline?: string
  location?: string
}

export function applyTemplate(template: string, profile: TemplateProfile): string {
  return template
    .replace(/\{\{firstName\}\}/g, profile.firstName || "")
    .replace(/\{\{lastName\}\}/g, profile.lastName || "")
    .replace(/\{\{fullName\}\}/g, `${profile.firstName || ""} ${profile.lastName || ""}`.trim())
    .replace(/\{\{headline\}\}/g, profile.headline || "")
    .replace(/\{\{location\}\}/g, profile.location || "")
}

// Cuts at the last full sentence or word that fits, never mid-word.
export function fitInviteNote(text: string): string {
  const note = text.trim()
  if (note.length <= INVITE_NOTE_MAX) return note
  const head = note.slice(0, INVITE_NOTE_MAX)
  const sentenceEnd = Math.max(head.lastIndexOf(". "), head.lastIndexOf("! "), head.lastIndexOf("? "))
  if (sentenceEnd > INVITE_NOTE_MAX * 0.5) return head.slice(0, sentenceEnd + 1)
  const wordEnd = head.lastIndexOf(" ")
  return (wordEnd > 0 ? head.slice(0, wordEnd) : head).trim()
}

interface SendingHours {
  sendFromHour: number
  sendUntilHour: number
  sendWeekdaysOnly: boolean
  timezone: string
}

export function hasSendingHours(hours: SendingHours): boolean {
  return hours.sendFromHour > 0 || hours.sendUntilHour < 24 || hours.sendWeekdaysOnly
}

export function withinSendingHours(hours: SendingHours, at = new Date()): boolean {
  if (!hasSendingHours(hours)) return true
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: hours.timezone,
      hour: "numeric",
      hourCycle: "h23",
      weekday: "short",
    }).formatToParts(at)
    const hour = Number(parts.find((p) => p.type === "hour")?.value)
    const weekday = parts.find((p) => p.type === "weekday")?.value
    if (hours.sendWeekdaysOnly && (weekday === "Sat" || weekday === "Sun")) return false
    return hour >= hours.sendFromHour && hour < hours.sendUntilHour
  } catch {
    return true
  }
}
