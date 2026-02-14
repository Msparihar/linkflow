# Project Memory

## Identity
- LinkedIn Connect: LinkedIn outreach/messaging SaaS app (connections, chats, search, sequences)
- App title is "LinkedIn Connect", internal brand name in emails is "LinkFlow"

## Tech Stack
- Next.js 16 (App Router, RSC) + React 19 + TypeScript, deployed as standalone output
- Prisma ORM with PostgreSQL (migrated from SQLite), schema at prisma/schema.prisma
- Tailwind CSS v4 + shadcn/ui (new-york style) + Radix primitives + Lucide icons
- React Query (TanStack) for server data fetching, QueryProvider wraps dashboard layout
- Bun as package manager (bun.lockb), Dockerfile uses oven/bun for deps + build
- OpenAI SDK (gpt-5.2) for AI message generation at /api/ai/generate-message
- Unipile Node SDK for LinkedIn API integration (connections, chats, search, invites)
- Nodemailer for login/register email notifications via SMTP
- Zod for validation, react-hook-form for forms, bcryptjs for password hashing
- GSAP + Recharts used for landing page animations and charts
- Cheerio + Turndown in tools/scrape.ts for web scraping to markdown

## Project Structure
- src/app/ — Next.js App Router pages and API routes
- src/components/ — React components (panels, dialogs, sidebar, landing)
- src/components/ui/ — shadcn/ui primitives (button, card, input, dialog, etc.)
- src/lib/ — Utilities: prisma.ts, unipile.ts, cache.ts, mail.ts, utils.ts
- src/hooks/ — Custom hooks: use-mobile.ts, use-toast.ts, use-in-view.ts
- prisma/ — Schema, migrations, dev.db (legacy SQLite artifact)
- tools/scrape.ts — CLI web scraper, run via `bun run scrape`
- docs/ — Internal docs (gitignored): API reference, LinkedIn integration guides

## Auth & Session
- Cookie-based auth: user_id (7 days), unipile_account_id (30 days), linkedin_access_token
- Email/password auth with bcrypt, endpoints: /api/auth/login, /api/auth/register
- No JWT or NextAuth; raw httpOnly cookies set via Next.js cookies() API
- Unipile LinkedIn connection via hosted auth link or direct credential auth + checkpoint
- Auth callback at /auth/callback sets unipile session cookie after LinkedIn connect
- Dashboard layout (src/app/dashboard/layout.tsx) redirects to /login if no user_id cookie

## Database Schema (Prisma)
- User: id(cuid), email(unique), password(hashed), unipileAccountId(nullable)
- MessageTemplate: name, content, belongs to User
- OutreachSequence: name, status(draft/active/paused/completed), targetProfiles(JSON string)
- SequenceStep: order, type(invite/message/wait), templateId or customMessage, delay config
- SequenceExecution: per-profile execution tracking with status, currentStep, nextActionAt
- SequenceExecutionStep: individual step results (sent/failed/skipped)
- Cache tables: CachedConnection, CachedProfile, CachedChatAttendee (keyed by accountId)

## Caching Layer (src/lib/cache.ts)
- DB-backed cache for Unipile API data: connections(6h TTL), profiles(24h), chatAttendees(1h)
- Stale-while-revalidate pattern: returns stale data immediately, syncs in background
- syncConnections() paginates all connections from Unipile then bulk upserts to DB
- Cache invalidation available via invalidateCache(accountId, type?)

## API Routes
- /api/linkedin/connections — GET connections (cached, paginated, supports fetchAll=true)
- /api/linkedin/chats — GET chat list with attendee resolution + caching
- /api/linkedin/chats/[chatId]/messages — GET messages for a chat
- /api/linkedin/message — POST send message (new chat or reply to existing)
- /api/linkedin/search — GET search LinkedIn profiles (POST to Unipile under the hood)
- /api/linkedin/invite — POST send connection invitation (max 300 char message)
- /api/linkedin/profile — GET own profile; /api/linkedin/profile/[identifier] — GET other profile
- /api/templates — CRUD for message templates (GET list, POST create)
- /api/templates/[id] — PUT update, DELETE template
- /api/sequences — GET list, POST create outreach sequence with steps
- /api/sequences/[id] — GET/PUT/DELETE individual sequence
- /api/sequences/[id]/start — POST start sequence (creates executions for each target)
- /api/sequences/[id]/execute — POST execute next batch of pending sequence actions
- /api/sequences/[id]/pause — POST pause sequence
- /api/import/csv — POST parse CSV file and return contacts for LinkedIn search matching
- /api/auth/unipile/* — LinkedIn connect/disconnect/callback/checkpoint/session endpoints

## Dashboard Pages
- /dashboard redirects to /dashboard/connections by default
- /dashboard/connections — ConnectionsPanel with infinite scroll, sort, bulk select, messaging
- /dashboard/chats — ChatsPanel with chat list + message thread + AI message writer
- /dashboard/search — SearchPanel for LinkedIn people search
- /dashboard/sequences — SequencesPanel for outreach automation campaigns
- /dashboard/templates — TemplatesPanel for message template CRUD
- Pages requiring LinkedIn show LinkedinConnectPrompt if unipile_account_id cookie missing

## Key Patterns & Conventions
- All API routes use cookies() for auth; pattern: check user_id then unipile_account_id
- Unipile client is singleton (src/lib/unipile.ts), requires UNIPILE_API_URL + UNIPILE_ACCESS_TOKEN
- Some routes use Unipile SDK client, others use raw fetch to Unipile REST API directly
- Legacy LinkedIn OAuth fallback exists in profile/connections/message routes (rarely used)
- Prisma client is singleton with global cache for dev HMR (src/lib/prisma.ts)
- Template placeholders: {{firstName}}, {{lastName}}, {{fullName}}, {{headline}}, {{location}}
- Sequence execution adds random delays (1-3s) between invites to mimic human behavior
- AI message writer has anti-injection safeguards in system prompt
- CSS uses LinkedIn-inspired design system with CSS custom properties in globals.css
- Fonts: Plus Jakarta Sans (headings), Inter (body), JetBrains Mono (monospace)

## Environment Variables
- DATABASE_URL — PostgreSQL connection string
- UNIPILE_API_URL, UNIPILE_ACCESS_TOKEN — Unipile API credentials
- LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, LINKEDIN_REDIRECT_URI — Legacy OAuth
- NEXT_PUBLIC_APP_URL — App base URL for callbacks
- OPENAI_API_KEY — For AI message generation
- SMTP_SERVER, SMTP_PORT, SMTP_EMAIL, SMTP_PASSWORD, NOTIFY_EMAIL — Email notifications

## Scraping Tools
- _save_jobs.mjs reads _jobs_raw.json and generates wellfound-jobs.txt (run: `bun _save_jobs.mjs`)
- Wellfound scrape selector: `a[href^="/jobs/"]` filtered by `/jobs/\d+-/`, deduplicated via Set

## Gotchas
- next.config.mjs has ignoreBuildErrors:true for TypeScript — build won't catch type errors
- images.unoptimized:true — no Next.js image optimization
- Unipile callback stores account_id in global in-memory store (not DB) — lost on restart
- Sequence "message" step type is simplified — doesn't actually look up existing chat ID
- targetProfiles stored as JSON string in DB, parsed/serialized manually (not native JSON)
- CSV import max 100 contacts per file
- Prisma config uses "classic" engine (prisma.config.ts)
- .gitignore excludes docs/, .csv files, .env.*, and AI tooling directories
- Dockerfile runner stage uses node:lts-alpine (not bun) for production runtime
