import { redirect } from "next/navigation"

export default function DashboardPage() {
  // Default redirect to connections
  redirect("/dashboard/connections")
}
