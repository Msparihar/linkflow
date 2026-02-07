import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"

interface Profile {
  id: string
  firstName: string
  lastName: string
  headline?: string
  location?: string
}

// Helper to apply template placeholders
function applyTemplate(template: string, profile: Profile): string {
  return template
    .replace(/\{\{firstName\}\}/g, profile.firstName || "")
    .replace(/\{\{lastName\}\}/g, profile.lastName || "")
    .replace(/\{\{fullName\}\}/g, `${profile.firstName} ${profile.lastName}`.trim())
    .replace(/\{\{headline\}\}/g, profile.headline || "")
    .replace(/\{\{location\}\}/g, profile.location || "")
}

// POST /api/sequences/[id]/execute - Execute next batch of sequence actions
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies()
  const userId = cookieStore.get("user_id")?.value
  const unipileAccountId = cookieStore.get("unipile_account_id")?.value
  const { id } = await params

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  if (!unipileAccountId) {
    return NextResponse.json({ error: "LinkedIn not connected" }, { status: 401 })
  }

  const baseUrl = process.env.UNIPILE_API_URL
  const token = process.env.UNIPILE_ACCESS_TOKEN

  if (!baseUrl || !token) {
    return NextResponse.json({ error: "Unipile not configured" }, { status: 500 })
  }

  try {
    // Get sequence with steps and their templates
    const sequence = await prisma.outreachSequence.findFirst({
      where: { id, userId },
      include: {
        steps: {
          orderBy: { order: "asc" },
          include: { template: true }
        }
      }
    })

    if (!sequence) {
      return NextResponse.json({ error: "Sequence not found" }, { status: 404 })
    }

    if (sequence.status !== "active") {
      return NextResponse.json({ error: "Sequence is not active" }, { status: 400 })
    }

    // Get pending executions that are ready
    const pendingExecutions = await prisma.sequenceExecution.findMany({
      where: {
        sequenceId: id,
        status: { in: ["pending", "in_progress"] },
        nextActionAt: { lte: new Date() }
      },
      take: sequence.dailyLimit,
      orderBy: { nextActionAt: "asc" }
    })

    if (pendingExecutions.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No executions ready to process",
        processed: 0
      })
    }

    const results: Array<{
      executionId: string
      profileName: string
      status: "sent" | "failed" | "completed"
      error?: string
    }> = []

    for (const execution of pendingExecutions) {
      const profile = JSON.parse(execution.profileData) as Profile
      const currentStepIndex = execution.currentStep
      const step = sequence.steps[currentStepIndex]

      if (!step) {
        // No more steps, mark as completed
        await prisma.sequenceExecution.update({
          where: { id: execution.id },
          data: {
            status: "completed",
            completedAt: new Date()
          }
        })

        results.push({
          executionId: execution.id,
          profileName: execution.profileName,
          status: "completed"
        })

        continue
      }

      try {
        if (step.type === "invite") {
          // Send connection invitation
          const message = step.customMessage ||
            (step.template ? applyTemplate(step.template.content, profile) : undefined)

          const inviteBody: Record<string, unknown> = {
            provider_id: profile.id,
            account_id: unipileAccountId
          }

          if (message) {
            inviteBody.message = message.substring(0, 300)
          }

          const inviteResponse = await fetch(`${baseUrl}/api/v1/users/invite`, {
            method: "POST",
            headers: {
              "X-API-KEY": token,
              "Content-Type": "application/json",
              "Accept": "application/json"
            },
            body: JSON.stringify(inviteBody)
          })

          if (!inviteResponse.ok) {
            const errorText = await inviteResponse.text()
            throw new Error(`Invite failed: ${errorText}`)
          }

          // Record step execution
          await prisma.sequenceExecutionStep.create({
            data: {
              executionId: execution.id,
              stepId: step.id,
              stepOrder: step.order,
              status: "sent",
              sentAt: new Date()
            }
          })

          // Update sequence stats
          await prisma.outreachSequence.update({
            where: { id: sequence.id },
            data: { sentCount: { increment: 1 } }
          })

        } else if (step.type === "message") {
          // Send follow-up message (requires existing conversation)
          // This would need chat lookup - simplified for now
          const message = step.customMessage ||
            (step.template ? applyTemplate(step.template.content, profile) : "")

          // For now, just record as sent - actual messaging would need chat ID
          await prisma.sequenceExecutionStep.create({
            data: {
              executionId: execution.id,
              stepId: step.id,
              stepOrder: step.order,
              status: "sent",
              sentAt: new Date()
            }
          })

          console.log(`Would send message to ${execution.profileName}: ${message.substring(0, 50)}...`)

        } else if (step.type === "wait") {
          // Wait step - just move to next step with delay
          await prisma.sequenceExecutionStep.create({
            data: {
              executionId: execution.id,
              stepId: step.id,
              stepOrder: step.order,
              status: "sent",
              sentAt: new Date()
            }
          })
        }

        // Calculate next action time
        const nextStep = sequence.steps[currentStepIndex + 1]
        let nextActionAt: Date | null = null

        if (nextStep) {
          const delayMs =
            (nextStep.delayDays * 24 * 60 * 60 * 1000) +
            (nextStep.delayHours * 60 * 60 * 1000) +
            (nextStep.delayMinutes * 60 * 1000)

          // Add random delay between min and max
          const randomDelay = Math.floor(
            Math.random() * (sequence.delayMaxMinutes - sequence.delayMinMinutes + 1) +
            sequence.delayMinMinutes
          ) * 60 * 1000

          nextActionAt = new Date(Date.now() + delayMs + randomDelay)
        }

        // Update execution
        await prisma.sequenceExecution.update({
          where: { id: execution.id },
          data: {
            currentStep: currentStepIndex + 1,
            status: nextStep ? "in_progress" : "completed",
            nextActionAt,
            completedAt: nextStep ? null : new Date(),
            lastError: null
          }
        })

        results.push({
          executionId: execution.id,
          profileName: execution.profileName,
          status: nextStep ? "sent" : "completed"
        })

        // Add delay between invites to mimic human behavior
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error"

        // Record failed step
        await prisma.sequenceExecutionStep.create({
          data: {
            executionId: execution.id,
            stepId: step.id,
            stepOrder: step.order,
            status: "failed",
            error: errorMessage
          }
        })

        // Update execution with error
        await prisma.sequenceExecution.update({
          where: { id: execution.id },
          data: {
            lastError: errorMessage,
            retryCount: { increment: 1 },
            status: execution.retryCount >= 2 ? "failed" : "pending",
            nextActionAt: new Date(Date.now() + 60 * 60 * 1000) // Retry in 1 hour
          }
        })

        // Update sequence stats
        if (execution.retryCount >= 2) {
          await prisma.outreachSequence.update({
            where: { id: sequence.id },
            data: { failedCount: { increment: 1 } }
          })
        }

        results.push({
          executionId: execution.id,
          profileName: execution.profileName,
          status: "failed",
          error: errorMessage
        })
      }
    }

    // Check if sequence is complete
    const remainingExecutions = await prisma.sequenceExecution.count({
      where: {
        sequenceId: id,
        status: { in: ["pending", "in_progress"] }
      }
    })

    if (remainingExecutions === 0) {
      await prisma.outreachSequence.update({
        where: { id },
        data: { status: "completed" }
      })
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
      remaining: remainingExecutions
    })
  } catch (error) {
    console.error("Failed to execute sequence:", error)
    return NextResponse.json({ error: "Failed to execute sequence" }, { status: 500 })
  }
}
