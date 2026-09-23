import { prisma } from "@/lib/prisma"

// Official LinkedIn API (Community Management) for posting as a company page.
// Docs: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api

const API_BASE = "https://api.linkedin.com/rest"
const LINKEDIN_VERSION = process.env.LINKEDIN_API_VERSION || "202609"

export const PAGE_SCOPES = (
  process.env.LINKEDIN_PAGE_SCOPES ||
  "w_organization_social r_organization_social rw_organization_admin"
).trim()

export function getRedirectUri(origin: string) {
  return process.env.LINKEDIN_REDIRECT_URI || `${origin}/api/auth/linkedin/callback`
}

export function buildAuthorizeUrl(state: string, origin: string) {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.LINKEDIN_CLIENT_ID!,
    redirect_uri: getRedirectUri(origin),
    state,
    scope: PAGE_SCOPES,
  })
  return `https://www.linkedin.com/oauth/v2/authorization?${params}`
}

interface TokenResponse {
  access_token: string
  expires_in: number
  refresh_token?: string
  refresh_token_expires_in?: number
  scope?: string
}

async function requestToken(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      ...body,
      client_id: process.env.LINKEDIN_CLIENT_ID!,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
    }),
  })
  if (!res.ok) {
    throw new Error(`LinkedIn token request failed (${res.status}): ${await res.text()}`)
  }
  return res.json()
}

async function saveToken(userId: string, t: TokenResponse) {
  const now = Date.now()
  const data = {
    accessToken: t.access_token,
    expiresAt: new Date(now + t.expires_in * 1000),
    // Keep the old refresh token if LinkedIn doesn't send a new one
    ...(t.refresh_token
      ? {
          refreshToken: t.refresh_token,
          refreshExpiresAt: t.refresh_token_expires_in
            ? new Date(now + t.refresh_token_expires_in * 1000)
            : null,
        }
      : {}),
    ...(t.scope ? { scope: t.scope } : {}),
  }
  return prisma.linkedinPageAuth.upsert({
    where: { userId },
    create: { userId, ...data, scope: t.scope || PAGE_SCOPES },
    update: data,
  })
}

export async function exchangeCodeAndSave(userId: string, code: string, origin: string) {
  const t = await requestToken({
    grant_type: "authorization_code",
    code,
    redirect_uri: getRedirectUri(origin),
  })
  return saveToken(userId, t)
}

export class LinkedinAuthError extends Error {}

// Returns a usable access token, refreshing it when it is within 5 days of expiry.
export async function getAccessToken(userId: string): Promise<string> {
  const auth = await prisma.linkedinPageAuth.findUnique({ where: { userId } })
  if (!auth) throw new LinkedinAuthError("LinkedIn page not connected")

  const soon = Date.now() + 5 * 24 * 60 * 60 * 1000
  if (auth.expiresAt.getTime() > soon) return auth.accessToken

  const refreshUsable =
    auth.refreshToken && (!auth.refreshExpiresAt || auth.refreshExpiresAt.getTime() > Date.now())
  if (refreshUsable) {
    try {
      const updated = await saveToken(
        userId,
        await requestToken({ grant_type: "refresh_token", refresh_token: auth.refreshToken! })
      )
      return updated.accessToken
    } catch (err) {
      console.error("LinkedIn token refresh failed:", err)
    }
  }

  if (auth.expiresAt.getTime() > Date.now()) return auth.accessToken
  throw new LinkedinAuthError("LinkedIn token expired, sign in again")
}

async function linkedinFetch(token: string, path: string, init: RequestInit = {}) {
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Linkedin-Version": LINKEDIN_VERSION,
      "X-Restli-Protocol-Version": "2.0.0",
      "Content-Type": "application/json",
      ...init.headers,
    },
  })
}

export interface AdminOrg {
  urn: string
  id: string
  name: string
  role: string
}

const POSTING_ROLES = ["ADMINISTRATOR", "CONTENT_ADMINISTRATOR", "DIRECT_SPONSORED_CONTENT_POSTER"]

export async function listAdminOrgs(token: string): Promise<AdminOrg[]> {
  const res = await linkedinFetch(token, "/organizationAcls?q=roleAssignee&state=APPROVED&count=100")
  if (!res.ok) {
    throw new Error(`Could not list company pages (${res.status}): ${await res.text()}`)
  }
  const data = await res.json()
  const acls: { role: string; organization?: string; organizationTarget?: string }[] =
    data.elements || []

  const byUrn = new Map<string, string>()
  for (const acl of acls) {
    const urn = acl.organization || acl.organizationTarget
    if (urn?.startsWith("urn:li:organization:") && POSTING_ROLES.includes(acl.role) && !byUrn.has(urn)) {
      byUrn.set(urn, acl.role)
    }
  }

  return Promise.all(
    [...byUrn].map(async ([urn, role]) => {
      const id = urn.split(":").pop()!
      let name = `Organization ${id}`
      const orgRes = await linkedinFetch(token, `/organizations/${id}`)
      if (orgRes.ok) {
        const org = await orgRes.json()
        name = org.localizedName || name
      }
      return { urn, id, name, role }
    })
  )
}

// Posts use LinkedIn's "little" text format, where these characters are reserved.
// '#' is left alone so hashtags still work.
export function escapeLittleText(text: string) {
  return text.replace(/[\\|{}@[\]()<>*_~]/g, (c) => `\\${c}`)
}

export async function createOrgPost(token: string, orgUrn: string, text: string) {
  const res = await linkedinFetch(token, "/posts", {
    method: "POST",
    body: JSON.stringify({
      author: orgUrn,
      commentary: escapeLittleText(text),
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    }),
  })
  if (res.status !== 201) {
    throw new Error(`LinkedIn post failed (${res.status}): ${await res.text()}`)
  }
  return { postUrn: res.headers.get("x-restli-id") }
}
