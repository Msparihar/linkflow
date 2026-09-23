import { Suspense } from "react"
import { CompanyPanel } from "@/components/company-panel"

export default function CompanyPage() {
  return (
    <Suspense>
      <CompanyPanel />
    </Suspense>
  )
}
