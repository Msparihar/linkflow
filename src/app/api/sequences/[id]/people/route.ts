import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import { enrolTargets, mergeTargets, type TargetProfile } from "@/lib/sequence-data"

// POST /api/sequences/[id]/people - Add people to a sequence
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
    const sequence = await prisma.outreachSequence.findFirst({ where: { id, userId } })
    if (!sequence) {
      return NextResponse.json({ error: "Sequence not found" }, { status: 404 })
    }

    const { profiles = [] } = (await request.json()) as { profiles?: TargetProfile[] }
    const current = JSON.parse(sequence.targetProfiles) as TargetProfile[]
    const merged = mergeTargets(current, profiles)
    const added = merged.length - current.length

    await prisma.outreachSequence.update({
      where: { id },
      data: { targetProfiles: JSON.stringify(merged), totalTargets: merged.length }
    })

    if (sequence.status === "active") {
      await enrolTargets(id, merged)
    }

    return NextResponse.json({ success: true, added, alreadyThere: profiles.length - added })
  } catch (error) {
    console.error("Failed to add people:", error)
    return NextResponse.json({ error: "Failed to add people" }, { status: 500 })
  }
}
