import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import { enrolTargets, getSequenceStats, type TargetProfile } from "@/lib/sequence-data"

interface StepInput {
  type: string
  templateId?: string | null
  customMessage?: string | null
  delayDays?: number
  delayHours?: number
  delayMinutes?: number
  condition?: string | null
}

const OPEN = ["pending", "in_progress", "paused"]

// GET /api/sequences/[id] - Get a specific sequence with where each person stands
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
          where: { status: { not: "removed" } },
          orderBy: { updatedAt: "desc" },
          take: 1000,
          include: {
            steps: {
              where: { status: { in: ["sent", "accepted"] } },
              orderBy: { createdAt: "asc" },
              select: { status: true, sentAt: true, messageId: true, step: { select: { type: true } } }
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
      const profile = JSON.parse(execution.profileData) as TargetProfile
      const awaitingAccept = did("invite", "sent") && !did("invite", "accepted")

      let stage = "queued"
      if (execution.status === "replied") stage = "replied"
      else if (execution.status === "failed") stage = "failed"
      else if (execution.status === "not_accepted") stage = "not_accepted"
      else if (did("message", "sent")) stage = "messaged"
      else if (did("invite", "accepted")) stage = "accepted"
      else if (did("invite", "sent")) stage = "invited"
      else if (execution.status === "completed") stage = "done"

      let next: string | null = null
      if (OPEN.includes(execution.status) && nextStep) {
        if (execution.status === "paused") next = "Paused"
        else if (awaitingAccept && nextStep.type !== "invite") next = "Waiting for them to accept"
        else if (nextStep.type === "invite") next = "Invitation queued"
        else if (nextStep.type === "wait") next = "Waiting before the next message"
        else next = did("message", "sent") ? "Follow-up if no reply" : "First message"
      }

      const lastSent = [...execution.steps].reverse().find(s => s.sentAt)

      return {
        id: execution.id,
        profileId: execution.profileId,
        name: execution.profileName,
        headline: profile.headline || "",
        profilePicture: profile.profilePicture || "",
        publicIdentifier: profile.publicIdentifier || "",
        status: execution.status,
        stage,
        next,
        nextActionAt: execution.nextActionAt,
        error: execution.lastError,
        chatId: execution.steps.find(s => s.messageId)?.messageId || null,
        lastActivityAt: execution.completedAt || lastSent?.sentAt || null
      }
    })

    const { executions: _executions, ...rest } = sequence
    const stats = await getSequenceStats([id])

    return NextResponse.json({
      sequence: {
        ...rest,
        targetProfiles: JSON.parse(sequence.targetProfiles),
        executionCount: people.length,
        stats: stats.get(id),
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
      where: { id, userId },
      include: { steps: { orderBy: { order: "asc" } } }
    })

    if (!existing) {
      return NextResponse.json({ error: "Sequence not found" }, { status: 404 })
    }

    const body = await request.json()
    const {
      name,
      description,
      targetProfiles,
      dailyLimit,
      delayMinMinutes,
      delayMaxMinutes,
      sendFromHour,
      sendUntilHour,
      sendWeekdaysOnly,
      timezone,
      status
    } = body
    const steps = body.steps as StepInput[] | undefined

    const started = await prisma.sequenceExecution.count({ where: { sequenceId: id } })

    // Replacing step rows would wipe the send history, so started sequences keep their shape
    const sameShape =
      steps !== undefined &&
      steps.length === existing.steps.length &&
      existing.steps.every((current, index) => current.type === steps[index].type)

    if (steps !== undefined && started > 0 && !sameShape) {
      return NextResponse.json(
        { error: "This sequence has already started. You can edit its messages and waits, but not add, remove or reorder steps." },
        { status: 400 }
      )
    }

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
    if (sendFromHour !== undefined) updateData.sendFromHour = sendFromHour
    if (sendUntilHour !== undefined) updateData.sendUntilHour = sendUntilHour
    if (sendWeekdaysOnly !== undefined) updateData.sendWeekdaysOnly = sendWeekdaysOnly
    if (timezone !== undefined) updateData.timezone = timezone
    if (status !== undefined) updateData.status = status

    await prisma.outreachSequence.update({ where: { id }, data: updateData })

    // People taken off the list stop getting anything further
    if (targetProfiles !== undefined && started > 0) {
      await prisma.sequenceExecution.updateMany({
        where: {
          sequenceId: id,
          status: { in: OPEN },
          profileId: { notIn: (targetProfiles as TargetProfile[]).map(p => p.id) }
        },
        data: { status: "removed", nextActionAt: null }
      })
    }

    // People added while the sequence is running start right away
    if (targetProfiles !== undefined && existing.status === "active") {
      await enrolTargets(id, targetProfiles as TargetProfile[])
    }

    if (steps !== undefined && started > 0) {
      for (const [index, current] of existing.steps.entries()) {
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
    } else if (steps !== undefined) {
      await prisma.sequenceStep.deleteMany({ where: { sequenceId: id } })
      if (steps.length > 0) {
        await prisma.sequenceStep.createMany({
          data: steps.map((step, index) => ({
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
    }

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
