import { cookies } from "next/headers"
import { ChatsPanel } from "@/components/chats-panel"
import { LinkedinConnectPrompt } from "@/components/linkedin-connect-prompt"

export default async function ChatsPage() {
  const cookieStore = await cookies()
  const unipileAccountId = cookieStore.get("unipile_account_id")
  const linkedinConnected = !!unipileAccountId

  if (!linkedinConnected) {
    return <LinkedinConnectPrompt />
  }

  return <ChatsPanel />
}
