import { cookies } from "next/headers"
import { SearchPanel } from "@/components/search-panel"
import { LinkedinConnectPrompt } from "@/components/linkedin-connect-prompt"

export default async function SearchPage() {
  const cookieStore = await cookies()
  const unipileAccountId = cookieStore.get("unipile_account_id")
  const linkedinConnected = !!unipileAccountId

  if (!linkedinConnected) {
    return <LinkedinConnectPrompt />
  }

  return <SearchPanel />
}
