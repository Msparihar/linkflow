import { cookies } from "next/headers"
import { JobsPanel } from "@/components/jobs-panel"
import { LinkedinConnectPrompt } from "@/components/linkedin-connect-prompt"

export default async function JobsPage() {
  const cookieStore = await cookies()
  const unipileAccountId = cookieStore.get("unipile_account_id")
  const linkedinConnected = !!unipileAccountId

  if (!linkedinConnected) {
    return <LinkedinConnectPrompt />
  }

  return <JobsPanel />
}
