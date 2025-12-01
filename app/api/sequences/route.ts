import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"

// GET /api/sequences - List all sequences for the user
export async function GET() {
  const cookieStore = await cookies()
  const userId = cookieStore.get("user_id")?.value

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const sequences = await prisma.outreachSequence.findMany({
      where: { userId },
      include: {
        steps: {
          orderBy: { order: "asc" },
          include: { template: true }
        },
        _count: {
          select: { executions: true }
        }
      },
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json({
      sequences: sequences.map(seq => ({
        ...seq,
        targetProfiles: JSON.parse(seq.targetProfiles),
        executionCount: seq._count.executions
      }))
    })
  } catch (error) {
    console.error("Failed to fetch sequences:", error)
    return NextResponse.json({ error: "Failed to fetch sequences" }, { status: 500 })
  }
}

// POST /api/sequences - Create a new sequence
export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const userId = cookieStore.get("user_id")?.value

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const {
      name,
      description,
      targetProfiles = [],
      steps = [],
      dailyLimit = 30,
      delayMinMinutes = 5,
      delayMaxMinutes = 15
    } = body

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    // Create sequence with steps in a transaction
    const sequence = await prisma.outreachSequence.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        userId,
        targetProfiles: JSON.stringify(targetProfiles),
        totalTargets: targetProfiles.length,
        dailyLimit,
        delayMinMinutes,
        delayMaxMinutes,
        steps: {
          create: steps.map((step: {
            type: string
            templateId?: string
            customMessage?: string
            delayDays?: number
            delayHours?: number
            delayMinutes?: number
            condition?: string
          }, index: number) => ({
            order: index + 1,
            type: step.type,
            templateId: step.templateId || null,
            customMessage: step.customMessage || null,
            delayDays: step.delayDays || 0,
            delayHours: step.delayHours || 0,
            delayMinutes: step.delayMinutes || 0,
            condition: step.condition || null
          }))
        }
      },
      include: {
        steps: {
          orderBy: { order: "asc" },
          include: { template: true }
        }
      }
    })

    return NextResponse.json({
      sequence: {
        ...sequence,
        targetProfiles: JSON.parse(sequence.targetProfiles)
      }
    })
  } catch (error) {
    console.error("Failed to create sequence:", error)
    return NextResponse.json({ error: "Failed to create sequence" }, { status: 500 })
  }
}
