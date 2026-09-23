import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { randomBytes } from "crypto"
import { buildAuthorizeUrl } from "@/lib/linkedin-pages"

// Starts the official LinkedIn OAuth flow for company page posting
export async function GET(request: NextRequest) {
  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin
  const cookieStore = await cookies()
  if (!cookieStore.get("user_id")?.value) {
    return NextResponse.redirect(new URL("/login", origin))
  }

  const state = randomBytes(16).toString("hex")
  cookieStore.set("linkedin_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  })

  return NextResponse.redirect(buildAuthorizeUrl(state, origin))
}
