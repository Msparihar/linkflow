import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"

// POST /api/sequences/[id]/start - Start a sequence
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
    // Check ownership and get sequence
    const sequence = await prisma.outreachSequence.findFirst({
      where: { id, userId },
      include: {
        steps: { orderBy: { order: "asc" } }
      }
    })

    if (!sequence) {
      return NextResponse.json({ error: "Sequence not found" }, { status: 404 })
    }

    if (sequence.status === "active") {
      return NextResponse.json({ error: "Sequence is already active" }, { status: 400 })
    }

    const targetProfiles = JSON.parse(sequence.targetProfiles) as Array<{
      id: string
      firstName: string
      lastName: string
      headline?: string
      profilePicture?: string
      location?: string
    }>

    if (targetProfiles.length === 0) {
      return NextResponse.json({ error: "No target profiles in sequence" }, { status: 400 })
    }

    if (sequence.steps.length === 0) {
      return NextResponse.json({ error: "Sequence has no steps defined" }, { status: 400 })
    }

    // Create executions for each target profile that doesn't already have one
    const existingExecutions = await prisma.sequenceExecution.findMany({
      where: { sequenceId: id },
      select: { profileId: true }
    })
    const existingProfileIds = new Set(existingExecutions.map(e => e.profileId))

    const newProfiles = targetProfiles.filter(p => !existingProfileIds.has(p.id))

    if (newProfiles.length > 0) {
      await prisma.sequenceExecution.createMany({
        data: newProfiles.map(profile => ({
          sequenceId: id,
          profileId: profile.id,
          profileName: `${profile.firstName} ${profile.lastName}`.trim(),
          profileData: JSON.stringify(profile),
          status: "pending",
          currentStep: 0,
          nextActionAt: new Date() // Ready to execute immediately
        }))
      })
    }

    // Update sequence status to active
    await prisma.outreachSequence.update({
      where: { id },
      data: { status: "active" }
    })

    return NextResponse.json({
      success: true,
      message: `Sequence started with ${targetProfiles.length} targets`,
      newExecutions: newProfiles.length
    })
  } catch (error) {
    console.error("Failed to start sequence:", error)
    return NextResponse.json({ error: "Failed to start sequence" }, { status: 500 })
  }
}
