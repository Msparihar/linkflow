import { ConnectionsPanel } from "@/components/connections-panel"
import { LinkedinConnectPrompt } from "@/components/linkedin-connect-prompt"
import { getLinkedinStatus } from "@/lib/session"

export default async function ConnectionsPage() {
  const linkedinStatus = await getLinkedinStatus()

  if (linkedinStatus !== "connected") {
    return <LinkedinConnectPrompt expired={linkedinStatus === "expired"} />
  }

  return <ConnectionsPanel />
}
