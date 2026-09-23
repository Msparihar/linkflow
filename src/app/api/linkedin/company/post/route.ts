import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createOrgPost, getAccessToken, LinkedinAuthError } from "@/lib/linkedin-pages"

const MAX_LENGTH = 3000

// POST { organization: "urn:li:organization:123", text: "..." } — publish a text post as the page
export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const userId = cookieStore.get("user_id")?.value
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { organization, text } = await request.json()
  if (typeof organization !== "string" || !/^urn:li:organization:\d+$/.test(organization)) {
    return NextResponse.json({ error: "A valid organization URN is required" }, { status: 400 })
  }
  if (typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "Post text is required" }, { status: 400 })
  }
  if (text.length > MAX_LENGTH) {
    return NextResponse.json({ error: `Post text must be ${MAX_LENGTH} characters or less` }, { status: 400 })
  }

  try {
    const token = await getAccessToken(userId)
    const result = await createOrgPost(token, organization, text.trim())
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    console.error("Company post error:", err)
    const status = err instanceof LinkedinAuthError ? 401 : 502
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to post" },
      { status }
    )
  }
}
