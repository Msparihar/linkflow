"use client"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Upload,
  FileText,
  Search,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  User,
  Building2,
  Mail,
  Phone,
  ExternalLink,
  Users,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

interface CSVContact {
  firstName: string
  lastName: string
  email?: string
  phone?: string
  company?: string
  linkedinUrl?: string
}

interface LinkedInProfile {
  id: string
  firstName: string
  lastName: string
  headline?: string
  profilePicture?: string
  publicIdentifier?: string
  profileUrl?: string
  connectionDegree?: number
  location?: string
}

interface ContactWithMatches {
  csvData: CSVContact
  searchQuery: string
  matches: LinkedInProfile[]
  status: "pending" | "searching" | "found" | "no_match" | "error"
  selectedMatch?: LinkedInProfile
  error?: string
}

interface Sequence {
  id: string
  name: string
  status: string
  totalTargets: number
}

interface CSVImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImportComplete: (profiles: LinkedInProfile[], sequenceId?: string) => void
  sequences?: Sequence[]
}

export function CSVImportDialog({
  open,
  onOpenChange,
  onImportComplete,
  sequences = []
}: CSVImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  // States
  const [step, setStep] = useState<"upload" | "searching" | "review" | "complete">("upload")
  const [contacts, setContacts] = useState<ContactWithMatches[]>([])
  const [searchProgress, setSearchProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [expandedContacts, setExpandedContacts] = useState<Set<number>>(new Set())
  const [selectedSequenceId, setSelectedSequenceId] = useState<string>("")
  const [importing, setImporting] = useState(false)

  const resetDialog = () => {
    setStep("upload")
    setContacts([])
    setSearchProgress(0)
    setError(null)
    setUploading(false)
    setExpandedContacts(new Set())
    setSelectedSequenceId("")
    setImporting(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.name.endsWith(".csv")) {
      setError("Please upload a CSV file")
      return
    }

    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch("/api/import/csv", {
        method: "POST",
        body: formData
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to upload CSV")
        return
      }

      setContacts(data.contacts)
      setStep("searching")

      // Start searching for matches
      await searchForMatches(data.contacts)
    } catch (err) {
      console.error("Upload error:", err)
      setError("Failed to upload CSV file")
    } finally {
      setUploading(false)
    }
  }

  const searchForMatches = async (contactList: ContactWithMatches[]) => {
    const updatedContacts = [...contactList]

    for (let i = 0; i < updatedContacts.length; i++) {
      const contact = updatedContacts[i]

      // Update status to searching
      updatedContacts[i] = { ...contact, status: "searching" }
      setContacts([...updatedContacts])
      setSearchProgress(((i) / updatedContacts.length) * 100)

      try {
        // Search LinkedIn for this contact
        const searchQuery = contact.searchQuery
        if (searchQuery.length < 2) {
          updatedContacts[i] = { ...contact, status: "error", error: "Name too short", matches: [] }
          continue
        }

        const res = await fetch(`/api/linkedin/search?q=${encodeURIComponent(searchQuery)}&limit=5`)

        if (!res.ok) {
          updatedContacts[i] = { ...contact, status: "error", error: "Search failed", matches: [] }
          continue
        }

        const data = await res.json()
        const matches = data.profiles || []

        if (matches.length === 0) {
          updatedContacts[i] = { ...contact, status: "no_match", matches: [] }
        } else {
          // Auto-select best match if name matches closely
          const bestMatch = findBestMatch(contact.csvData, matches)
          updatedContacts[i] = {
            ...contact,
            status: "found",
            matches,
            selectedMatch: bestMatch
          }
        }

        setContacts([...updatedContacts])

        // Add delay between searches to avoid rate limiting
        if (i < updatedContacts.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      } catch (err) {
        console.error("Search error:", err)
        updatedContacts[i] = { ...contact, status: "error", error: "Search failed", matches: [] }
        setContacts([...updatedContacts])
      }
    }

    setSearchProgress(100)
    setStep("review")
  }

  const findBestMatch = (csvData: CSVContact, matches: LinkedInProfile[]): LinkedInProfile | undefined => {
    // Find exact name match
    const exactMatch = matches.find(m =>
      m.firstName.toLowerCase() === csvData.firstName.toLowerCase() &&
      m.lastName.toLowerCase() === (csvData.lastName || "").toLowerCase()
    )
    if (exactMatch) return exactMatch

    // Find partial name match
    const partialMatch = matches.find(m =>
      m.firstName.toLowerCase() === csvData.firstName.toLowerCase() ||
      m.lastName.toLowerCase() === (csvData.lastName || "").toLowerCase()
    )
    return partialMatch
  }

  const handleSelectMatch = (contactIndex: number, profile: LinkedInProfile | undefined) => {
    const updatedContacts = [...contacts]
    updatedContacts[contactIndex] = {
      ...updatedContacts[contactIndex],
      selectedMatch: profile
    }
    setContacts(updatedContacts)
  }

  const toggleContactExpanded = (index: number) => {
    const newExpanded = new Set(expandedContacts)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedContacts(newExpanded)
  }

  const getSelectedProfiles = (): LinkedInProfile[] => {
    return contacts
      .filter(c => c.selectedMatch)
      .map(c => c.selectedMatch!)
  }

  const handleImport = async () => {
    const selectedProfiles = getSelectedProfiles()
    if (selectedProfiles.length === 0) {
      setError("Please select at least one match to import")
      return
    }

    setImporting(true)

    try {
      onImportComplete(selectedProfiles, selectedSequenceId || undefined)
      setStep("complete")
    } catch (err) {
      console.error("Import error:", err)
      setError("Failed to import profiles")
    } finally {
      setImporting(false)
    }
  }

  const getStatusIcon = (status: ContactWithMatches["status"]) => {
    switch (status) {
      case "pending":
        return <div className="w-4 h-4 rounded-full border-2 border-muted" />
      case "searching":
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
      case "found":
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case "no_match":
        return <XCircle className="w-4 h-4 text-yellow-500" />
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-500" />
    }
  }

  const getStatusText = (status: ContactWithMatches["status"]) => {
    switch (status) {
      case "pending": return "Pending"
      case "searching": return "Searching..."
      case "found": return "Matches found"
      case "no_match": return "No matches"
      case "error": return "Error"
    }
  }

  const selectedCount = contacts.filter(c => c.selectedMatch).length
  const foundCount = contacts.filter(c => c.status === "found").length
  const noMatchCount = contacts.filter(c => c.status === "no_match").length

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open)
      if (!open) resetDialog()
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            {step === "upload" && "Import Contacts from CSV"}
            {step === "searching" && "Searching LinkedIn..."}
            {step === "review" && "Review & Select Matches"}
            {step === "complete" && "Import Complete"}
          </DialogTitle>
          <DialogDescription>
            {step === "upload" && "Upload a CSV file with contacts to find them on LinkedIn"}
            {step === "searching" && "Searching for LinkedIn profiles matching your contacts"}
            {step === "review" && "Review the matches and select the correct profiles"}
            {step === "complete" && "Your selected profiles have been imported"}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex-1 overflow-hidden">
          {/* Step 1: Upload */}
          {step === "upload" && (
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
                <FileText className="w-12 h-12 text-muted-foreground" />
              </div>

              <div className="text-center space-y-2">
                <h3 className="font-semibold text-lg">Upload your CSV file</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Your CSV should have columns like: First Name, Last Name, Email, Phone, Company.
                  We&apos;ll search LinkedIn using name and company.
                </p>
              </div>

              <div className="space-y-3">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  disabled={uploading}
                  className="max-w-xs"
                />

                {uploading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Parsing CSV file...
                  </div>
                )}
              </div>

              <div className="text-xs text-muted-foreground bg-muted/50 p-4 rounded-lg max-w-md">
                <p className="font-medium mb-2">Supported columns:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>First Name / FirstName / first_name</li>
                  <li>Last Name / LastName / last_name</li>
                  <li>Email / E-mail</li>
                  <li>Phone / Mobile / Cell</li>
                  <li>Company / Organization</li>
                </ul>
                <p className="mt-2 text-yellow-600">
                  Note: Email and phone are stored for reference but cannot be used for LinkedIn search.
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Searching */}
          {step === "searching" && (
            <div className="py-8 space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Searching contacts...</span>
                  <span>{Math.round(searchProgress)}%</span>
                </div>
                <Progress value={searchProgress} />
              </div>

              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {contacts.map((contact, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                    >
                      {getStatusIcon(contact.status)}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {contact.csvData.firstName} {contact.csvData.lastName}
                        </p>
                        {contact.csvData.company && (
                          <p className="text-xs text-muted-foreground truncate">
                            {contact.csvData.company}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {getStatusText(contact.status)}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Step 3: Review */}
          {step === "review" && (
            <div className="space-y-4 overflow-hidden flex flex-col h-full">
              {/* Summary */}
              <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm">{foundCount} matches found</span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm">{noMatchCount} no matches</span>
                </div>
                <div className="flex-1" />
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span className="text-sm font-medium">{selectedCount} selected</span>
                </div>
              </div>

              {/* Contact list with matches */}
              <ScrollArea className="flex-1 h-[350px]">
                <div className="space-y-2 pr-4">
                  {contacts.map((contact, index) => (
                    <Collapsible
                      key={index}
                      open={expandedContacts.has(index)}
                      onOpenChange={() => toggleContactExpanded(index)}
                    >
                      <div className={cn(
                        "rounded-lg border bg-card overflow-hidden",
                        contact.selectedMatch && "ring-2 ring-primary"
                      )}>
                        <CollapsibleTrigger asChild>
                          <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50">
                            {expandedContacts.has(index) ? (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            )}

                            {/* CSV Data */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-muted-foreground" />
                                <span className="font-medium">
                                  {contact.csvData.firstName} {contact.csvData.lastName}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                                {contact.csvData.company && (
                                  <span className="flex items-center gap-1">
                                    <Building2 className="w-3 h-3" />
                                    {contact.csvData.company}
                                  </span>
                                )}
                                {contact.csvData.email && (
                                  <span className="flex items-center gap-1">
                                    <Mail className="w-3 h-3" />
                                    {contact.csvData.email}
                                  </span>
                                )}
                                {contact.csvData.phone && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="w-3 h-3" />
                                    {contact.csvData.phone}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Status/Selection */}
                            <div className="flex items-center gap-2">
                              {contact.selectedMatch ? (
                                <Badge className="bg-green-100 text-green-700">
                                  Selected: {contact.selectedMatch.firstName} {contact.selectedMatch.lastName}
                                </Badge>
                              ) : contact.status === "found" ? (
                                <Badge variant="secondary">
                                  {contact.matches.length} matches
                                </Badge>
                              ) : contact.status === "no_match" ? (
                                <Badge variant="outline" className="text-yellow-600">
                                  No matches
                                </Badge>
                              ) : contact.status === "error" ? (
                                <Badge variant="destructive">
                                  Error
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <div className="border-t p-3 bg-muted/30 space-y-3">
                            {contact.matches.length > 0 ? (
                              <>
                                <p className="text-sm font-medium">Select the correct match:</p>
                                <div className="space-y-2">
                                  {/* Option: No match / Skip */}
                                  <label
                                    className={cn(
                                      "flex items-center gap-3 p-2 rounded-lg border cursor-pointer hover:bg-background",
                                      !contact.selectedMatch && "ring-2 ring-primary"
                                    )}
                                    onClick={() => handleSelectMatch(index, undefined)}
                                  >
                                    <Checkbox
                                      checked={!contact.selectedMatch}
                                      className="rounded-full"
                                    />
                                    <span className="text-sm text-muted-foreground">
                                      None of these / Skip this contact
                                    </span>
                                  </label>

                                  {/* Match options */}
                                  {contact.matches.map((match) => (
                                    <label
                                      key={match.id}
                                      className={cn(
                                        "flex items-center gap-3 p-2 rounded-lg border cursor-pointer hover:bg-background",
                                        contact.selectedMatch?.id === match.id && "ring-2 ring-primary"
                                      )}
                                      onClick={() => handleSelectMatch(index, match)}
                                    >
                                      <Checkbox
                                        checked={contact.selectedMatch?.id === match.id}
                                        className="rounded-full"
                                      />
                                      <Avatar className="w-10 h-10">
                                        <AvatarImage src={match.profilePicture} />
                                        <AvatarFallback>
                                          {match.firstName?.charAt(0)}{match.lastName?.charAt(0)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium">
                                            {match.firstName} {match.lastName}
                                          </span>
                                          {match.connectionDegree && (
                                            <Badge variant="outline" className="text-xs">
                                              {match.connectionDegree === 1 ? "1st" :
                                                match.connectionDegree === 2 ? "2nd" : "3rd+"}
                                            </Badge>
                                          )}
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate">
                                          {match.headline}
                                        </p>
                                        {match.location && (
                                          <p className="text-xs text-muted-foreground">
                                            {match.location}
                                          </p>
                                        )}
                                      </div>
                                      {match.profileUrl && (
                                        <a
                                          href={match.profileUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="p-1 hover:bg-muted rounded"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <ExternalLink className="w-4 h-4 text-muted-foreground" />
                                        </a>
                                      )}
                                    </label>
                                  ))}
                                </div>
                              </>
                            ) : (
                              <p className="text-sm text-muted-foreground">
                                No LinkedIn profiles found matching this contact.
                              </p>
                            )}
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  ))}
                </div>
              </ScrollArea>

              {/* Actions */}
              <div className="border-t pt-4 space-y-4">
                {/* Sequence selection */}
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium">Add to sequence:</label>
                  <Select value={selectedSequenceId} onValueChange={setSelectedSequenceId}>
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Select a sequence (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">Create new sequence</SelectItem>
                      {sequences.map((seq) => (
                        <SelectItem key={seq.id} value={seq.id}>
                          {seq.name} ({seq.totalTargets} targets)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    {selectedCount} profile{selectedCount !== 1 ? "s" : ""} will be imported
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleImport}
                      disabled={selectedCount === 0 || importing}
                    >
                      {importing ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : null}
                      Import {selectedCount} Profile{selectedCount !== 1 ? "s" : ""}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Complete */}
          {step === "complete" && (
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
              <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>

              <div className="text-center space-y-2">
                <h3 className="font-semibold text-lg">Import Successful!</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedCount} profile{selectedCount !== 1 ? "s have" : " has"} been added
                  {selectedSequenceId ? " to your sequence" : ""}.
                </p>
              </div>

              <Button onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
