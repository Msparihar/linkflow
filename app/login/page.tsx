import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { LoginPage } from "@/components/login-page"

export default async function Login() {
  const cookieStore = await cookies()

  // Already logged in — go to dashboard
  const userId = cookieStore.get("user_id")

  if (userId) {
    redirect("/dashboard")
  }

  return <LoginPage />
}
