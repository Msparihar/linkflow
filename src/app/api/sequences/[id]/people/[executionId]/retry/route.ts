import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"

// POST /api/sequences/[id]/people/[executionId]/retry - Try a failed person again
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; executionId: string }> }
) {
  const cookieStore = await cookies()
  const userId = cookieStore.get("user_id")?.value
  const { id, executionId } = await params

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const execution = await prisma.sequenceExecution.findFirst({
      where: { id: executionId, sequenceId: id, sequence: { userId } },
      include: { sequence: { select: { status: true } } }
    })
    if (!execution) {
      return NextResponse.json({ error: "Person not found in this sequence" }, { status: 404 })
    }
    if (execution.status !== "failed") {
      return NextResponse.json({ error: "Only a failed step can be retried" }, { status: 400 })
    }

    const paused = execution.sequence.status === "paused"
    await prisma.sequenceExecution.update({
      where: { id: executionId },
      data: {
        status: paused ? "paused" : "in_progress",
        retryCount: 0,
        lastError: null,
        nextActionAt: new Date()
      }
    })
    await prisma.outreachSequence.update({
      where: { id },
      data: {
        failedCount: { decrement: 1 },
        ...(execution.sequence.status === "completed" ? { status: "active" } : {})
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to retry:", error)
    return NextResponse.json({ error: "Failed to retry" }, { status: 500 })
  }
}
