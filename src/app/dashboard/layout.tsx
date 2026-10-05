import { redirect } from "next/navigation"
import { DashboardShell } from "@/components/dashboard-shell"
import { QueryProvider } from "@/components/query-provider"
import { getLinkedinStatus, getSession } from "@/lib/session"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await getSession()

  if (!userId) {
    redirect("/login")
  }

  const linkedinStatus = await getLinkedinStatus()

  return (
    <QueryProvider>
      <DashboardShell linkedinStatus={linkedinStatus}>
        {children}
      </DashboardShell>
    </QueryProvider>
  )
}
