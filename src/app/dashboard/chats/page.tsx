import { ChatsPanel } from "@/components/chats-panel"
import { LinkedinConnectPrompt } from "@/components/linkedin-connect-prompt"
import { getLinkedinStatus } from "@/lib/session"

export default async function ChatsPage() {
  const linkedinStatus = await getLinkedinStatus()

  if (linkedinStatus !== "connected") {
    return <LinkedinConnectPrompt expired={linkedinStatus === "expired"} />
  }

  return <ChatsPanel />
}
