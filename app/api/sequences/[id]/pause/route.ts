import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"

// POST /api/sequences/[id]/pause - Pause a sequence
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies()
  const userId = cookieStore.get("user_id")?.value
  const { id } = await params

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    // Check ownership
    const sequence = await prisma.outreachSequence.findFirst({
      where: { id, userId }
    })

    if (!sequence) {
      return NextResponse.json({ error: "Sequence not found" }, { status: 404 })
    }

    if (sequence.status !== "active") {
      return NextResponse.json({ error: "Sequence is not active" }, { status: 400 })
    }

    // Update sequence status to paused
    await prisma.outreachSequence.update({
      where: { id },
      data: { status: "paused" }
    })

    // Pause all pending executions
    await prisma.sequenceExecution.updateMany({
      where: {
        sequenceId: id,
        status: { in: ["pending", "in_progress"] }
      },
      data: { status: "paused" }
    })

    return NextResponse.json({
      success: true,
      message: "Sequence paused"
    })
  } catch (error) {
    console.error("Failed to pause sequence:", error)
    return NextResponse.json({ error: "Failed to pause sequence" }, { status: 500 })
  }
}
