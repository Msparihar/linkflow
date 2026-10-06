import { NextRequest, NextResponse } from "next/server"
import { requireLinkedin } from "@/lib/session"
import { runSequence, SequenceRunError, type RunSummary } from "@/lib/sequence-engine"

function describe(summary: RunSummary): string {
  if (summary.paused) return summary.paused

  const parts: string[] = []
  parts.push(summary.sent > 0 ? `Sent ${summary.sent} now.` : "Nothing was ready to send.")
  if (summary.heldForLimit > 0) {
    parts.push(`The limit of ${summary.dailyLimit} per 24 hours is used up; ${summary.heldForLimit} held until it frees up.`)
  }
  if (summary.inviteLimit) parts.push("LinkedIn's own sending limit is reached; trying again tomorrow.")
  if (summary.waiting > 0) parts.push(`${summary.waiting} waiting on a delay or an accept.`)
  if (summary.retrying > 0) parts.push(`${summary.retrying} hit a LinkedIn error and will be retried in an hour.`)
  if (summary.failed > 0) parts.push(`${summary.failed} failed.`)
  return parts.join(" ")
}

// POST /api/sequences/[id]/execute - Send the next few ready actions now
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireLinkedin()
  if (session instanceof NextResponse) return session
  const { id } = await params

  try {
    const summary = await runSequence(id, { manual: true, userId: session.userId })
    return NextResponse.json({ success: true, message: describe(summary), ...summary })
  } catch (error) {
    if (error instanceof SequenceRunError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("Failed to execute sequence:", error)
    return NextResponse.json({ error: "Failed to execute sequence" }, { status: 500 })
  }
}
