import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const cookieStore = await cookies()
  const userId = cookieStore.get("user_id")?.value
  const unipileAccountId = cookieStore.get("unipile_account_id")?.value

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  if (!unipileAccountId) {
    return NextResponse.json({ error: "LinkedIn not connected" }, { status: 401 })
  }

  const baseUrl = process.env.UNIPILE_API_URL
  const token = process.env.UNIPILE_ACCESS_TOKEN

  if (!baseUrl || !token) {
    return NextResponse.json({ error: "Unipile not configured" }, { status: 500 })
  }

  const { jobId } = await params

  try {
    const response = await fetch(
      `${baseUrl}/api/v1/linkedin/jobs/${jobId}?account_id=${unipileAccountId}`,
      {
        method: "GET",
        headers: {
          "X-API-KEY": token,
          Accept: "application/json",
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Job detail fetch error:", errorText)
      return NextResponse.json(
        { error: "Failed to fetch job details" },
        { status: response.status }
      )
    }

    const data = await response.json()

    const company = data.company as string | Record<string, unknown> | undefined
    const companyName =
      data.company_name ||
      (typeof company === "string" ? company : company?.name) ||
      ""
    const companyLogo =
      data.company_logo_url ||
      data.company_logo ||
      (typeof company === "object" && company ? company.logo || company.logo_url : undefined) ||
      ""

    return NextResponse.json({
      id: data.id || data.job_id || jobId,
      title: data.title || data.job_title || "",
      company: String(companyName),
      companyLogo: String(companyLogo),
      location: typeof data.location === "string" ? data.location : "",
      workplaceType: data.workplace_type || "",
      jobType: data.job_type || data.employment_type || "",
      postedAt: data.posted_at || data.listed_at || "",
      description: data.description || "",
      url: data.url || data.job_url || "",
      applicantCount: data.applicant_count || data.num_applicants || null,
      salary: data.salary || data.compensation || "",
      seniorityLevel: data.seniority_level || "",
      industry: data.industry || "",
      employmentType: data.employment_type || "",
      jobFunction: data.job_function || "",
    })
  } catch (error) {
    console.error("Job detail error:", error)
    return NextResponse.json(
      { error: "Failed to fetch job details" },
      { status: 500 }
    )
  }
}
