import { cookies } from "next/headers"
import { ConnectionsPanel } from "@/components/connections-panel"
import { LinkedinConnectPrompt } from "@/components/linkedin-connect-prompt"

export default async function ConnectionsPage() {
  const cookieStore = await cookies()
  const unipileAccountId = cookieStore.get("unipile_account_id")
  const linkedinConnected = !!unipileAccountId

  if (!linkedinConnected) {
    return <LinkedinConnectPrompt />
  }

  return <ConnectionsPanel />
}
