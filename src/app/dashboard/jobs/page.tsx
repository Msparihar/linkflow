import { JobsPanel } from "@/components/jobs-panel"
import { LinkedinConnectPrompt } from "@/components/linkedin-connect-prompt"
import { getLinkedinStatus } from "@/lib/session"

export default async function JobsPage() {
  const linkedinStatus = await getLinkedinStatus()

  if (linkedinStatus !== "connected") {
    return <LinkedinConnectPrompt expired={linkedinStatus === "expired"} />
  }

  return <JobsPanel />
}
