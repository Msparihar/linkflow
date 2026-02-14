"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Search,
  Loader2,
  Briefcase,
  MapPin,
  Clock,
  Building2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Users,
  DollarSign,
  SlidersHorizontal,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Job {
  id: string
  title: string
  company: string
  companyLogo: string
  location: string
  workplaceType: string
  jobType: string
  postedAt: string
  description: string
  url: string
  applicantCount: number | null
  salary: string
}

interface JobDetail extends Job {
  seniorityLevel: string
  industry: string
  employmentType: string
  jobFunction: string
}

interface JobSearchResponse {
  jobs: Job[]
  cursor: string | null
  total: number | null
}

const JOB_TYPE_OPTIONS = [
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "temporary", label: "Temporary" },
  { value: "internship", label: "Internship" },
]

const EXPERIENCE_OPTIONS = [
  { value: "internship", label: "Internship" },
  { value: "entry", label: "Entry Level" },
  { value: "associate", label: "Associate" },
  { value: "mid-senior", label: "Mid-Senior" },
  { value: "director", label: "Director" },
  { value: "executive", label: "Executive" },
]

const WORKPLACE_OPTIONS = [
  { value: "on-site", label: "On-site" },
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
]

const DATE_POSTED_OPTIONS = [
  { value: "past-24h", label: "Past 24 hours" },
  { value: "past-week", label: "Past week" },
  { value: "past-month", label: "Past month" },
]

export function JobsPanel() {
  const [keywords, setKeywords] = useState("")
  const [location, setLocation] = useState("")
  const [jobType, setJobType] = useState("")
  const [experienceLevel, setExperienceLevel] = useState("")
  const [workplaceType, setWorkplaceType] = useState("")
  const [datePosted, setDatePosted] = useState("")

  // Search trigger state — only fetch when user clicks search
  const [searchTrigger, setSearchTrigger] = useState<{
    keywords: string
    location: string
    jobType: string
    experienceLevel: string
    workplaceType: string
    datePosted: string
  } | null>(null)

  // Pagination
  const [page, setPage] = useState(1)
  const [cursors, setCursors] = useState<string[]>([])

  // Job detail dialog
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [selectedJobPreview, setSelectedJobPreview] = useState<Job | null>(null)

  const currentCursor = page > 1 ? cursors[page - 2] : undefined

  const {
    data,
    isLoading,
    isFetching,
  } = useQuery<JobSearchResponse>({
    queryKey: ["jobs", searchTrigger, currentCursor],
    queryFn: async () => {
      if (!searchTrigger) return { jobs: [], cursor: null, total: null }

      const params = new URLSearchParams()
      if (searchTrigger.keywords) params.set("q", searchTrigger.keywords)
      if (searchTrigger.location) params.set("location", searchTrigger.location)
      if (searchTrigger.jobType) params.set("jobType", searchTrigger.jobType)
      if (searchTrigger.experienceLevel) params.set("experienceLevel", searchTrigger.experienceLevel)
      if (searchTrigger.workplaceType) params.set("workplaceType", searchTrigger.workplaceType)
      if (searchTrigger.datePosted) params.set("datePosted", searchTrigger.datePosted)
      if (currentCursor) params.set("cursor", currentCursor)
      params.set("limit", "20")

      const res = await fetch(`/api/linkedin/jobs/search?${params.toString()}`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Search failed")
      }
      return res.json()
    },
    enabled: !!searchTrigger,
    staleTime: 5 * 60 * 1000,
  })

  const { data: jobDetail, isLoading: isDetailLoading } = useQuery<JobDetail>({
    queryKey: ["job-detail", selectedJobId],
    queryFn: async () => {
      const res = await fetch(`/api/linkedin/jobs/${selectedJobId}`)
      if (!res.ok) throw new Error("Failed to fetch job details")
      return res.json()
    },
    enabled: !!selectedJobId,
    staleTime: 10 * 60 * 1000,
  })

  const handleSearch = () => {
    if (!keywords.trim() && !location.trim()) return
    setPage(1)
    setCursors([])
    setSearchTrigger({ keywords: keywords.trim(), location: location.trim(), jobType, experienceLevel, workplaceType, datePosted })
  }

  const handleNextPage = () => {
    if (data?.cursor) {
      setCursors((prev) => {
        const next = [...prev]
        next[page - 1] = data.cursor!
        return next
      })
      setPage((p) => p + 1)
    }
  }

  const handlePrevPage = () => {
    if (page > 1) {
      setPage((p) => p - 1)
    }
  }

  const handleOpenJob = (job: Job) => {
    setSelectedJobPreview(job)
    setSelectedJobId(job.id)
  }

  const handleCloseJob = () => {
    setSelectedJobId(null)
    setSelectedJobPreview(null)
  }

  const clearFilters = () => {
    setJobType("")
    setExperienceLevel("")
    setWorkplaceType("")
    setDatePosted("")
  }

  const hasActiveFilters = jobType || experienceLevel || workplaceType || datePosted
  const jobs = data?.jobs || []
  const hasSearched = !!searchTrigger

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ""
    try {
      const date = new Date(dateStr)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      if (diffDays === 0) return "Today"
      if (diffDays === 1) return "Yesterday"
      if (diffDays < 7) return `${diffDays} days ago`
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
      return `${Math.floor(diffDays / 30)} months ago`
    } catch {
      return dateStr
    }
  }

  const displayJob = jobDetail || selectedJobPreview

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Jobs</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Search LinkedIn job listings
        </p>
      </div>

      {/* Search bar */}
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Job title, keywords, or company..."
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-10 h-11 bg-card shadow-sm"
            />
          </div>
          <div className="relative flex-1 sm:max-w-[240px]">
            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="City, state, or remote..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-10 h-11 bg-card shadow-sm"
            />
          </div>
          <Button
            onClick={handleSearch}
            disabled={isFetching || (!keywords.trim() && !location.trim())}
            className="h-11 px-6 shadow-sm"
          >
            {isFetching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Search
              </>
            )}
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-muted-foreground hidden sm:block" />
          <Select value={jobType} onValueChange={setJobType}>
            <SelectTrigger className="w-full sm:w-[140px] h-9 bg-card shadow-sm text-sm">
              <SelectValue placeholder="Job Type" />
            </SelectTrigger>
            <SelectContent>
              {JOB_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={experienceLevel} onValueChange={setExperienceLevel}>
            <SelectTrigger className="w-full sm:w-[150px] h-9 bg-card shadow-sm text-sm">
              <SelectValue placeholder="Experience" />
            </SelectTrigger>
            <SelectContent>
              {EXPERIENCE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={workplaceType} onValueChange={setWorkplaceType}>
            <SelectTrigger className="w-full sm:w-[140px] h-9 bg-card shadow-sm text-sm">
              <SelectValue placeholder="Workplace" />
            </SelectTrigger>
            <SelectContent>
              {WORKPLACE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={datePosted} onValueChange={setDatePosted}>
            <SelectTrigger className="w-full sm:w-[155px] h-9 bg-card shadow-sm text-sm">
              <SelectValue placeholder="Date Posted" />
            </SelectTrigger>
            <SelectContent>
              {DATE_POSTED_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-muted-foreground h-9"
            >
              Clear filters
            </Button>
          )}
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <Skeleton className="w-12 h-12 rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : jobs.length > 0 ? (
        <>
          {data?.total && (
            <p className="text-sm text-muted-foreground">
              {data.total.toLocaleString()} results found
            </p>
          )}
          <div className="space-y-3">
            {jobs.map((job, index) => (
              <Card
                key={`${job.id}-${index}`}
                className="card-hover cursor-pointer group overflow-hidden"
                onClick={() => handleOpenJob(job)}
              >
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <Avatar className="w-12 h-12 rounded-lg flex-shrink-0">
                      <AvatarImage
                        src={job.companyLogo ? `/api/proxy-image?url=${encodeURIComponent(job.companyLogo)}` : undefined}
                        alt={job.company}
                        className="rounded-lg"
                      />
                      <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-semibold text-sm">
                        {job.company?.charAt(0) || "J"}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base truncate group-hover:text-primary transition-colors">
                        {job.title}
                      </h3>
                      <p className="text-sm text-muted-foreground truncate mt-0.5">
                        <Building2 className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" />
                        {job.company}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                        {job.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {job.location}
                          </span>
                        )}
                        {job.postedAt && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(job.postedAt)}
                          </span>
                        )}
                        {job.applicantCount && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {job.applicantCount} applicants
                          </span>
                        )}
                        {job.salary && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            {job.salary}
                          </span>
                        )}
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {job.workplaceType && (
                          <Badge variant="secondary" className="text-[11px] py-0">
                            {job.workplaceType}
                          </Badge>
                        )}
                        {job.jobType && (
                          <Badge variant="outline" className="text-[11px] py-0">
                            {job.jobType}
                          </Badge>
                        )}
                      </div>

                      {job.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-2 leading-relaxed">
                          {job.description}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-2 pt-4">
            <Button
              variant="outline"
              size="icon"
              disabled={page === 1}
              onClick={handlePrevPage}
              className="h-9 w-9"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              Page {page}
            </span>
            <Button
              variant="outline"
              size="icon"
              disabled={!data?.cursor}
              onClick={handleNextPage}
              className="h-9 w-9"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </>
      ) : hasSearched ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <Briefcase className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-1">No jobs found</h3>
          <p className="text-muted-foreground text-center max-w-sm">
            Try adjusting your search terms or filters
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <Briefcase className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-1">Search for jobs</h3>
          <p className="text-muted-foreground text-center max-w-sm">
            Enter keywords, job titles, or company names to find opportunities on LinkedIn
          </p>
        </div>
      )}

      {/* Job Detail Dialog */}
      <Dialog open={!!selectedJobId} onOpenChange={() => handleCloseJob()}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-start gap-3 pr-6">
              {displayJob && (
                <>
                  <Avatar className="w-12 h-12 rounded-lg flex-shrink-0">
                    <AvatarImage
                      src={displayJob.companyLogo ? `/api/proxy-image?url=${encodeURIComponent(displayJob.companyLogo)}` : undefined}
                      alt={displayJob.company}
                      className="rounded-lg"
                    />
                    <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-semibold">
                      {displayJob.company?.charAt(0) || "J"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <span className="text-foreground text-lg leading-tight block">
                      {displayJob.title}
                    </span>
                    <p className="text-sm font-normal text-muted-foreground mt-1">
                      {displayJob.company}
                    </p>
                  </div>
                </>
              )}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Job details for {displayJob?.title} at {displayJob?.company}
            </DialogDescription>
          </DialogHeader>

          {isDetailLoading && !selectedJobPreview ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : displayJob ? (
            <div className="space-y-5 mt-2">
              {/* Meta info */}
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                {displayJob.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    {displayJob.location}
                  </span>
                )}
                {displayJob.postedAt && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    {formatDate(displayJob.postedAt)}
                  </span>
                )}
                {displayJob.applicantCount && (
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    {displayJob.applicantCount} applicants
                  </span>
                )}
                {displayJob.salary && (
                  <span className="flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4" />
                    {displayJob.salary}
                  </span>
                )}
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                {displayJob.workplaceType && (
                  <Badge variant="secondary">{displayJob.workplaceType}</Badge>
                )}
                {displayJob.jobType && (
                  <Badge variant="outline">{displayJob.jobType}</Badge>
                )}
                {(jobDetail as JobDetail)?.seniorityLevel && (
                  <Badge variant="outline">{(jobDetail as JobDetail).seniorityLevel}</Badge>
                )}
                {(jobDetail as JobDetail)?.industry && (
                  <Badge variant="outline">{(jobDetail as JobDetail).industry}</Badge>
                )}
              </div>

              {/* Description */}
              {(jobDetail?.description || displayJob.description) && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">About the role</h4>
                  <div
                    className={cn(
                      "text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap",
                      "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
                      "[&_li]:mt-1 [&_p]:mt-2 [&_strong]:text-foreground [&_strong]:font-semibold"
                    )}
                  >
                    {jobDetail?.description || displayJob.description}
                  </div>
                </div>
              )}

              {/* Action */}
              <div className="flex gap-2 pt-2">
                {displayJob.url && (
                  <Button asChild className="flex-1 sm:flex-initial">
                    <a
                      href={displayJob.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View on LinkedIn
                    </a>
                  </Button>
                )}
                {!displayJob.url && displayJob.id && (
                  <Button asChild className="flex-1 sm:flex-initial">
                    <a
                      href={`https://www.linkedin.com/jobs/view/${displayJob.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View on LinkedIn
                    </a>
                  </Button>
                )}
                <Button variant="outline" onClick={handleCloseJob}>
                  Close
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
