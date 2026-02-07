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
          orderBy: { createdAt: "desc" },
          take: 100
        }
      }
    })

    if (!sequence) {
      return NextResponse.json({ error: "Sequence not found" }, { status: 404 })
    }

    return NextResponse.json({
      sequence: {
        ...sequence,
        targetProfiles: JSON.parse(sequence.targetProfiles)
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

    // If steps are provided, replace them
    if (steps !== undefined) {
      // Delete existing steps
      await prisma.sequenceStep.deleteMany({
        where: { sequenceId: id }
      })

      // Create new steps
      if (steps.length > 0) {
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
