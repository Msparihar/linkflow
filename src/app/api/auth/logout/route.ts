import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST() {
  const cookieStore = await cookies()

  // Clear all auth cookies
  cookieStore.delete("user_id")
  cookieStore.delete("linkedin_access_token")
  cookieStore.delete("unipile_account_id")

  return NextResponse.json({ success: true })
}
