import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/dashboard-shell"
import { QueryProvider } from "@/components/query-provider"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()

  // Check for user session
  const userId = cookieStore.get("user_id")

  if (!userId) {
    redirect("/login")
  }

  // Check if LinkedIn is connected
  const unipileAccountId = cookieStore.get("unipile_account_id")
  const linkedinConnected = !!unipileAccountId

  return (
    <QueryProvider>
      <DashboardShell linkedinConnected={linkedinConnected}>
        {children}
      </DashboardShell>
    </QueryProvider>
  )
}
