import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import type { TargetProfile } from "@/lib/sequence-data"

// DELETE /api/sequences/[id]/people/[executionId] - Take one person out of a sequence
export async function DELETE(
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
      include: { sequence: true }
    })
    if (!execution) {
      return NextResponse.json({ error: "Person not found in this sequence" }, { status: 404 })
    }

    const targets = (JSON.parse(execution.sequence.targetProfiles) as TargetProfile[])
      .filter(p => p.id !== execution.profileId)

    // The row stays so what was already sent still counts toward the daily limit
    await prisma.sequenceExecution.update({
      where: { id: executionId },
      data: { status: "removed", nextActionAt: null }
    })
    await prisma.outreachSequence.update({
      where: { id },
      data: {
        targetProfiles: JSON.stringify(targets),
        totalTargets: targets.length,
        ...(execution.status === "failed" ? { failedCount: { decrement: 1 } } : {})
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to remove person:", error)
    return NextResponse.json({ error: "Failed to remove person" }, { status: 500 })
  }
}
