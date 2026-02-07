import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

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
  error?: string
}

// POST /api/import/csv - Parse CSV and search for matches
export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const userId = cookieStore.get("user_id")?.value
  const unipileAccountId = cookieStore.get("unipile_account_id")?.value

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  if (!unipileAccountId) {
    return NextResponse.json({ error: "LinkedIn not connected" }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Read and parse CSV
    const csvText = await file.text()
    const contacts = parseCSV(csvText)

    if (contacts.length === 0) {
      return NextResponse.json({ error: "No valid contacts found in CSV" }, { status: 400 })
    }

    if (contacts.length > 100) {
      return NextResponse.json({
        error: "CSV contains too many contacts. Maximum 100 contacts per import."
      }, { status: 400 })
    }

    // Return parsed contacts for client-side searching
    // We'll let the client trigger searches one by one to show progress
    const contactsWithStatus: ContactWithMatches[] = contacts.map(contact => ({
      csvData: contact,
      searchQuery: buildSearchQuery(contact),
      matches: [],
      status: "pending"
    }))

    return NextResponse.json({
      contacts: contactsWithStatus,
      total: contacts.length
    })
  } catch (error) {
    console.error("CSV import error:", error)
    return NextResponse.json({ error: "Failed to process CSV file" }, { status: 500 })
  }
}

function parseCSV(csvText: string): CSVContact[] {
  const lines = csvText.trim().split(/\r?\n/)
  if (lines.length < 2) return []

  // Parse header row
  const headerLine = lines[0]
  const headers = parseCSVLine(headerLine).map(h => h.toLowerCase().trim())

  // Map common header variations
  const headerMap: Record<string, keyof CSVContact> = {}

  headers.forEach((header, index) => {
    const h = header.toLowerCase()
    if (h.includes("first") && h.includes("name") || h === "firstname" || h === "first_name" || h === "first") {
      headerMap[index] = "firstName"
    } else if (h.includes("last") && h.includes("name") || h === "lastname" || h === "last_name" || h === "last") {
      headerMap[index] = "lastName"
    } else if (h === "name" || h === "full name" || h === "fullname" || h === "full_name") {
      headerMap[index] = "firstName" // Will be split later
    } else if (h.includes("email") || h === "e-mail" || h === "e_mail") {
      headerMap[index] = "email"
    } else if (h.includes("phone") || h.includes("mobile") || h.includes("cell") || h === "tel" || h === "telephone") {
      headerMap[index] = "phone"
    } else if (h.includes("company") || h.includes("organization") || h.includes("org") || h === "employer") {
      headerMap[index] = "company"
    } else if (h.includes("linkedin") || h.includes("profile") || h.includes("url")) {
      headerMap[index] = "linkedinUrl"
    }
  })

  // Check if we have at least a name field
  const hasNameField = Object.values(headerMap).some(v => v === "firstName" || v === "lastName")
  if (!hasNameField) {
    return []
  }

  // Parse data rows
  const contacts: CSVContact[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length === 0 || values.every(v => !v.trim())) continue

    const contact: CSVContact = {
      firstName: "",
      lastName: ""
    }

    values.forEach((value, index) => {
      const field = headerMap[index]
      if (field && value.trim()) {
        contact[field] = value.trim()
      }
    })

    // Handle full name in firstName field (split it)
    if (contact.firstName && !contact.lastName && contact.firstName.includes(" ")) {
      const nameParts = contact.firstName.split(" ")
      contact.firstName = nameParts[0]
      contact.lastName = nameParts.slice(1).join(" ")
    }

    // Only add if we have at least a first name
    if (contact.firstName) {
      contacts.push(contact)
    }
  }

  return contacts
}

function parseCSVLine(line: string): string[] {
  const values: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === "," && !inQuotes) {
      values.push(current.trim())
      current = ""
    } else {
      current += char
    }
  }

  values.push(current.trim())
  return values
}

function buildSearchQuery(contact: CSVContact): string {
  const parts: string[] = []

  if (contact.firstName) parts.push(contact.firstName)
  if (contact.lastName) parts.push(contact.lastName)
  if (contact.company) parts.push(contact.company)

  return parts.join(" ")
}
