import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { LoginPage } from "@/components/login-page"

export default async function Home() {
  const cookieStore = await cookies()

  // Check for user session
  const userId = cookieStore.get("user_id")

  if (userId) {
    redirect("/dashboard")
  }

  return <LoginPage />
}
