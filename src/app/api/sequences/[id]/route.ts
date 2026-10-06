import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"

// GET /api/sequences/[id] - Get a specific sequence
export async function GET(
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
    const sequence = await prisma.outreachSequence.findFirst({
      where: { id, userId },
      include: {
        steps: {
          orderBy: { order: "asc" },
          include: { template: true }
        },
        executions: {
          orderBy: { updatedAt: "desc" },
          take: 500,
          include: {
            steps: {
              where: { status: { in: ["sent", "accepted"] } },
              select: { status: true, step: { select: { type: true } } }
            }
          }
        }
      }
    })

    if (!sequence) {
      return NextResponse.json({ error: "Sequence not found" }, { status: 404 })
    }

    const people = sequence.executions.map(execution => {
      const did = (type: string, status: string) =>
        execution.steps.some(s => s.step.type === type && s.status === status)
      const nextStep = sequence.steps[execution.currentStep]

      let stage = "Not started"
      if (execution.status === "replied") stage = "Replied"
      else if (execution.status === "failed") stage = "Failed"
      else if (execution.status === "not_accepted") stage = "Invitation not accepted"
      else if (did("message", "sent")) stage = "Message sent"
      else if (did("invite", "accepted")) stage = "Accepted"
      else if (did("invite", "sent")) stage = "Invitation sent"
      else if (execution.status === "completed") stage = "Done"

      let next: string | null = null
      if (["pending", "in_progress", "paused"].includes(execution.status) && nextStep) {
        if (execution.status === "paused") next = "Paused"
        else if (nextStep.type === "message" && did("invite", "sent") && !did("invite", "accepted")) next = "Waiting for them to accept"
        else next = nextStep.type === "invite" ? "Invitation queued" : nextStep.type === "message" ? "Message queued" : "Waiting"
      }

      return {
        id: execution.id,
        profileId: execution.profileId,
        name: execution.profileName,
        status: execution.status,
        stage,
        next,
        nextActionAt: execution.nextActionAt,
        error: execution.lastError,
        updatedAt: execution.updatedAt
      }
    })

    const { executions: _executions, ...rest } = sequence

    return NextResponse.json({
      sequence: {
        ...rest,
        targetProfiles: JSON.parse(sequence.targetProfiles),
        people
      }
    })
  } catch (error) {
    console.error("Failed to fetch sequence:", error)
    return NextResponse.json({ error: "Failed to fetch sequence" }, { status: 500 })
  }
}

// PUT /api/sequences/[id] - Update a sequence
export async function PUT(
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
    const existing = await prisma.outreachSequence.findFirst({
      where: { id, userId }
    })

    if (!existing) {
      return NextResponse.json({ error: "Sequence not found" }, { status: 404 })
    }

    const body = await request.json()
    const {
      name,
      description,
      targetProfiles,
      steps,
      dailyLimit,
      delayMinMinutes,
      delayMaxMinutes,
      status
    } = body

    // Build update data
    const updateData: Record<string, unknown> = {}

    if (name !== undefined) updateData.name = name.trim()
    if (description !== undefined) updateData.description = description?.trim() || null
    if (targetProfiles !== undefined) {
      updateData.targetProfiles = JSON.stringify(targetProfiles)
      updateData.totalTargets = targetProfiles.length
    }
    if (dailyLimit !== undefined) updateData.dailyLimit = dailyLimit
    if (delayMinMinutes !== undefined) updateData.delayMinMinutes = delayMinMinutes
    if (delayMaxMinutes !== undefined) updateData.delayMaxMinutes = delayMaxMinutes
    if (status !== undefined) updateData.status = status

    // Update sequence
    const sequence = await prisma.outreachSequence.update({
      where: { id },
      data: updateData,
      include: {
        steps: {
          orderBy: { order: "asc" },
          include: { template: true }
        }
      }
    })

    // People added while the sequence is running start right away
    if (targetProfiles !== undefined && sequence.status === "active") {
      const existing = await prisma.sequenceExecution.findMany({
        where: { sequenceId: id },
        select: { profileId: true }
      })
      const known = new Set(existing.map(e => e.profileId))
      const added = (targetProfiles as Array<{ id: string; firstName?: string; lastName?: string }>)
        .filter(p => !known.has(p.id))
      if (added.length > 0) {
        await prisma.sequenceExecution.createMany({
          data: added.map(profile => ({
            sequenceId: id,
            profileId: profile.id,
            profileName: `${profile.firstName || ""} ${profile.lastName || ""}`.trim(),
            profileData: JSON.stringify(profile),
            status: "pending",
            currentStep: 0,
            nextActionAt: new Date()
          }))
        })
      }
    }

    // If steps are provided, replace them
    if (steps !== undefined) {
      const started = await prisma.sequenceExecution.count({ where: { sequenceId: id } })

      if (started > 0) {
        // Replacing step rows would wipe the send history, so edit them in place
        const sameShape =
          steps.length === sequence.steps.length &&
          sequence.steps.every((current, index) => current.type === steps[index].type)

        if (!sameShape) {
          return NextResponse.json(
            { error: "This sequence has already started. You can edit its messages and waits, but not add, remove or reorder steps." },
            { status: 400 }
          )
        }

        for (const [index, current] of sequence.steps.entries()) {
          const step = steps[index]
          await prisma.sequenceStep.update({
            where: { id: current.id },
            data: {
              templateId: step.templateId || null,
              customMessage: step.customMessage || null,
              delayDays: step.delayDays || 0,
              delayHours: step.delayHours || 0,
              delayMinutes: step.delayMinutes || 0
            }
          })
        }
      } else {
        // Delete existing steps
        await prisma.sequenceStep.deleteMany({
          where: { sequenceId: id }
        })
      }

      // Create new steps
      if (started === 0 && steps.length > 0) {
        await prisma.sequenceStep.createMany({
          data: steps.map((step: {
            type: string
            templateId?: string
            customMessage?: string
            delayDays?: number
            delayHours?: number
            delayMinutes?: number
            condition?: string
          }, index: number) => ({
            sequenceId: id,
            order: index + 1,
            type: step.type,
            templateId: step.templateId || null,
            customMessage: step.customMessage || null,
            delayDays: step.delayDays || 0,
            delayHours: step.delayHours || 0,
            delayMinutes: step.delayMinutes || 0,
            condition: step.condition || null
          }))
        })
      }

      // Re-fetch with new steps
      const updated = await prisma.outreachSequence.findFirst({
        where: { id },
        include: {
          steps: {
            orderBy: { order: "asc" },
            include: { template: true }
          }
        }
      })

      return NextResponse.json({
        sequence: {
          ...updated,
          targetProfiles: JSON.parse(updated!.targetProfiles)
        }
      })
    }

    return NextResponse.json({
      sequence: {
        ...sequence,
        targetProfiles: JSON.parse(sequence.targetProfiles)
      }
    })
  } catch (error) {
    console.error("Failed to update sequence:", error)
    return NextResponse.json({ error: "Failed to update sequence" }, { status: 500 })
  }
}

// DELETE /api/sequences/[id] - Delete a sequence
export async function DELETE(
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
    const existing = await prisma.outreachSequence.findFirst({
      where: { id, userId }
    })

    if (!existing) {
      return NextResponse.json({ error: "Sequence not found" }, { status: 404 })
    }

    // Delete sequence (cascades to steps and executions)
    await prisma.outreachSequence.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete sequence:", error)
    return NextResponse.json({ error: "Failed to delete sequence" }, { status: 500 })
  }
}
