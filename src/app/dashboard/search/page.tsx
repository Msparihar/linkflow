import { SearchPanel } from "@/components/search-panel"
import { LinkedinConnectPrompt } from "@/components/linkedin-connect-prompt"
import { getLinkedinStatus } from "@/lib/session"

export default async function SearchPage() {
  const linkedinStatus = await getLinkedinStatus()

  if (linkedinStatus !== "connected") {
    return <LinkedinConnectPrompt expired={linkedinStatus === "expired"} />
  }

  return <SearchPanel />
}
