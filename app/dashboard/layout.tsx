import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/dashboard-shell"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()

  // Check for user session
  const userId = cookieStore.get("user_id")

  if (!userId) {
    redirect("/")
  }

  // Check if LinkedIn is connected
  const unipileAccountId = cookieStore.get("unipile_account_id")
  const linkedinConnected = !!unipileAccountId

  return (
    <DashboardShell linkedinConnected={linkedinConnected}>
      {children}
    </DashboardShell>
  )
}
