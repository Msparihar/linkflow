import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

// LinkedIn filter value mappings
const JOB_TYPE_MAP: Record<string, string> = {
  "full-time": "F",
  "part-time": "P",
  "contract": "C",
  "temporary": "T",
  "internship": "I",
}

const EXPERIENCE_MAP: Record<string, string> = {
  "internship": "1",
  "entry": "2",
  "associate": "3",
  "mid-senior": "4",
  "director": "5",
  "executive": "6",
}

const WORKPLACE_MAP: Record<string, string> = {
  "on-site": "1",
  "remote": "2",
  "hybrid": "3",
}

const DATE_POSTED_MAP: Record<string, string> = {
  "past-24h": "r86400",
  "past-week": "r604800",
  "past-month": "r2592000",
}

export async function GET(request: NextRequest) {
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

  const searchParams = request.nextUrl.searchParams
  const keywords = searchParams.get("q") || ""
  const location = searchParams.get("location") || ""
  const jobType = searchParams.get("jobType") || ""
  const experienceLevel = searchParams.get("experienceLevel") || ""
  const workplaceType = searchParams.get("workplaceType") || ""
  const datePosted = searchParams.get("datePosted") || ""
  const cursor = searchParams.get("cursor") || ""
  const limit = parseInt(searchParams.get("limit") || "20", 10)

  if (!keywords.trim() && !location.trim()) {
    return NextResponse.json(
      { error: "Keywords or location is required" },
      { status: 400 }
    )
  }

  try {
    // Build LinkedIn job search URL with filters
    const urlParts: string[] = []
    if (keywords.trim()) urlParts.push(`keywords=${encodeURIComponent(keywords.trim())}`)
    if (location.trim()) urlParts.push(`location=${encodeURIComponent(location.trim())}`)
    if (jobType && JOB_TYPE_MAP[jobType]) urlParts.push(`f_JT=${JOB_TYPE_MAP[jobType]}`)
    if (experienceLevel && EXPERIENCE_MAP[experienceLevel]) urlParts.push(`f_E=${EXPERIENCE_MAP[experienceLevel]}`)
    if (workplaceType && WORKPLACE_MAP[workplaceType]) urlParts.push(`f_WT=${WORKPLACE_MAP[workplaceType]}`)
    if (datePosted && DATE_POSTED_MAP[datePosted]) urlParts.push(`f_TPR=${DATE_POSTED_MAP[datePosted]}`)

    const linkedinSearchUrl = `https://www.linkedin.com/jobs/search/?${urlParts.join("&")}`

    const body: Record<string, unknown> = {
      api: "classic",
      category: "jobs",
      limit,
      url: linkedinSearchUrl,
    }

    if (cursor) {
      body.cursor = cursor
    }

    const searchResponse = await fetch(
      `${baseUrl}/api/v1/linkedin/search?account_id=${unipileAccountId}`,
      {
        method: "POST",
        headers: {
          "X-API-KEY": token,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      }
    )

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text()
      console.error("LinkedIn job search error:", errorText)
      return NextResponse.json(
        { error: "Job search failed" },
        { status: searchResponse.status }
      )
    }

    const data = await searchResponse.json()

    const jobs =
      data.items?.map((item: Record<string, unknown>) => {
        // company can be a string or an object like { name: "...", logo: "...", url: "..." }
        const company = item.company as string | Record<string, unknown> | undefined
        const companyName =
          item.company_name ||
          (typeof company === "string" ? company : company?.name) ||
          ""
        const companyLogo =
          item.company_logo_url ||
          item.company_logo ||
          (typeof company === "object" && company ? company.logo || company.logo_url : undefined) ||
          ""

        return {
          id: item.id || item.job_id || item.entity_urn,
          title: item.title || item.job_title || "",
          company: String(companyName),
          companyLogo: String(companyLogo),
          location: typeof item.location === "string" ? item.location : "",
          workplaceType: item.workplace_type || (item.work_remote_allowed ? "Remote" : ""),
          jobType: item.job_type || item.employment_type || "",
          postedAt: item.posted_at || item.listed_at || item.date || "",
          description: item.description || item.snippet || "",
          url: item.url || item.job_url || "",
          applicantCount: item.applicant_count || item.num_applicants || null,
          salary: item.salary || item.compensation || "",
        }
      }) || []

    return NextResponse.json({
      jobs,
      cursor: data.cursor || null,
      total: data.paging?.total_count || null,
    })
  } catch (error) {
    console.error("Job search error:", error)
    return NextResponse.json(
      { error: "Failed to search jobs" },
      { status: 500 }
    )
  }
}
