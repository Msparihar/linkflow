import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { exchangeCodeAndSave } from "@/lib/linkedin-pages"

// Callback for the official LinkedIn OAuth flow started at /api/auth/linkedin/start.
// Saves the token in the DB so server jobs can post to company pages without the browser.
export async function GET(request: NextRequest) {
  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin
  const back = (params: Record<string, string>) =>
    NextResponse.redirect(new URL(`/dashboard/company?${new URLSearchParams(params)}`, origin))

  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const error = searchParams.get("error")

  const cookieStore = await cookies()
  const userId = cookieStore.get("user_id")?.value
  const expectedState = cookieStore.get("linkedin_oauth_state")?.value
  cookieStore.delete("linkedin_oauth_state")

  if (!userId) {
    return NextResponse.redirect(new URL("/login", origin))
  }

  if (error) {
    // unauthorized_scope_error means the LinkedIn app lacks Community Management API access
    return back({ error, detail: searchParams.get("error_description") || "" })
  }

  if (!code) {
    return back({ error: "no_code" })
  }

  if (!state || state !== expectedState) {
    return back({ error: "invalid_state" })
  }

  try {
    await exchangeCodeAndSave(userId, code, origin)
    return back({ connected: "1" })
  } catch (err) {
    console.error("LinkedIn OAuth callback error:", err)
    return back({ error: "token_exchange_failed" })
  }
}
