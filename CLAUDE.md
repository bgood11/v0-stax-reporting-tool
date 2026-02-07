# Stax Salesforce Reporting Tool

## Project Overview
Internal reporting tool for Shermin Finance to visualize and analyze Salesforce loan application data. Built with Next.js 16, deployed on Vercel, using Supabase for auth and database.

## Tech Stack
- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API routes, Supabase (PostgreSQL + Auth)
- **Data Source**: Salesforce (via SOQL API with Client Credentials OAuth)
- **Deployment**: Vercel (auto-deploys from GitHub)
- **Design Tool**: v0.dev (for UI changes)

## Key Architecture

### Authentication
- **Magic link auth** via Supabase
- Only pre-approved users can log in (added via admin panel)
- `barney.goodman@sherminfinance.co.uk` is the global_admin
- Callback handled client-side at `/app/auth/callback/page.tsx` (hash fragment tokens)

**CRITICAL: Package Versions**
- `@supabase/ssr`: Must be **v0.5.0+** (v0.1.0 has broken cookie handling)
- `@supabase/supabase-js`: v2.49.0+

**Auth Flow:**
1. User enters email → `signInWithOtp()` sends magic link
2. User clicks link → redirected to `/auth/callback#access_token=xxx&refresh_token=xxx`
3. Callback page reads hash fragment, calls `setSession()`
4. Browser client stores session in cookies (automatic in v0.5+)
5. Hard redirect to `/dashboard` (uses `window.location.href`, not `router.push`)
6. Middleware reads cookies via `getUser()`, allows access

### Data Sync
- **Daily cron job** at 1am UTC syncs Salesforce → Supabase
- Route: `/app/api/cron/sync/route.ts`
- Service: `/lib/sync-service.ts`
- Salesforce client: `/lib/salesforce.ts`
- Uses SOQL queries (no 2,000 row limit), falls back to Reports API

**Sync Architecture (supports 180k+ records):**
1. SOQL query fetches `Application_Decision__c` with automatic pagination via `nextRecordsUrl`
2. Full refresh strategy: DELETE all existing → INSERT fresh data
3. Batch inserts of 500 records to Supabase
4. Sync log tracks success/failure status and record counts
5. Cron configured in `vercel.json`: `"schedule": "0 1 * * *"` (1am UTC daily)

**Manual Sync:**
- Dashboard has "Sync Now" button (requires auth)
- POST `/api/sync` triggers sync
- GET `/api/sync?action=status` checks last sync status

### Key Salesforce Fields
Primary object: `Application_Decision__c`

**VERIFIED FIELD PATHS (MCP tested 2026-02-07):**

Data Model:
```
Application_Decision__c → Application__c → Opportunity (commission, finance product)
Application_Decision__c → Retailer__c (Account) → Owner (BDM name)
```

**SOQL Field Paths:**
- `Retailer__r.Owner.Name` - BDM (Account Owner is the BDM!)
- `Application__r.Opportunity__r.Shermin_Commission_Amount__c` - Commission
- `Application__r.Opportunity__r.Finance_Product2__c` - Finance Product
- `Loan_Amount__c` - Direct on AD
- `Lender_Name__c` or `Lender__r.Name` - Lender info

**Fields that DO NOT exist on Application_Decision__c:**
- `BDM_Name__c` - Use `Retailer__r.Owner.Name`
- `Shermin_Commission_Amount__c` - Use `Application__r.Opportunity__r.Shermin_Commission_Amount__c`

**Reports API Field Names:**
Returns fully-qualified names: `Application_Decision__c.Name`, `Account.Owner.Name`, `Opportunity.Shermin_Commission_Amount__c`

**Debugging:** Use `/api/salesforce/describe` to discover field names

## Important Files

### Backend
- `/lib/supabase/client.ts` - Browser Supabase client
- `/lib/supabase/server.ts` - Server Supabase client (uses secret key)
- `/lib/salesforce.ts` - Salesforce OAuth + SOQL queries
- `/lib/sync-service.ts` - Data sync orchestration
- `/lib/report-service.ts` - Report generation logic

### API Routes
- `/app/api/cron/sync/route.ts` - Daily Salesforce sync (Vercel cron)
- `/app/api/sync/route.ts` - Manual sync trigger + status
- `/app/api/reports/generate/route.ts` - Generate reports
- `/app/api/admin/users/route.ts` - User management

### Frontend Pages
- `/app/page.tsx` - Login page
- `/app/dashboard/page.tsx` - Main dashboard
- `/app/reports/page.tsx` - Report builder
- `/app/admin/users/page.tsx` - User management
- `/app/admin/settings/page.tsx` - System settings

## Environment Variables (Vercel)
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY
SF_CLIENT_ID
SF_CLIENT_SECRET
SALESFORCE_INSTANCE_URL=https://sherminmax.my.salesforce.com
CRON_SECRET
```

## Supabase Configuration
- **Project**: xyhetgmjyhmifrjikbjq
- **Site URL**: https://v0-stax-reporting-tool.vercel.app
- **Redirect URL**: https://v0-stax-reporting-tool.vercel.app/auth/callback

## Database Schema
See `/schema.sql` for full schema. Key tables:
- `application_decisions` - Synced Salesforce data
- `profiles` - User profiles with roles
- `report_presets` - Saved report configurations
- `generated_reports` - Report history
- `sync_log` - Sync job history

## User Roles
- `global_admin` - Full access, can delete users
- `admin` - Can manage users and settings
- `bdm` - Can view data for assigned BDM names only
- `viewer` - Read-only access (with assigned BDM names)

### User Data Isolation (BDM Name Filtering)
Users see data filtered by their assigned BDM names from `application_decisions.bdm_name`.

**Access Levels:**
- `global_admin` / `admin`: See ALL data (no filtering)
- Users with `ALL` assignment: See all data (e.g., Tony Lilley - commercial director)
- Users with specific BDM names: See only that BDM's data (e.g., Kathryn Wilson sees only her own applications)
- Users with no assignments: See NO data (safety default)

**Architecture:**
1. `user_bdm_assignments` table maps `user_email` → `bdm_name` (many-to-many)
2. BDM names come from synced Salesforce data (`application_decisions.bdm_name`)
3. `getAuthContext()` fetches user profile + assigned BDM names
4. `applyAuthFilters()` filters queries by `bdm_name` field

**Assignment Management:**
- GET `/api/admin/bdm-assignments?action=available` - Get list of BDM names from data
- GET `/api/admin/bdm-assignments?userEmail=xxx` - Get assignments for user
- POST `/api/admin/bdm-assignments` - Replace user's assignments
  - Body: `{ userEmail: string, bdmNames: string[] }`
  - Use `bdmNames: ["ALL"]` for full access

**Key Files:**
- `/lib/middleware/auth.ts` - AuthContext with `assignedBdmNames` and `hasFullAccess`
- `/lib/bdm-assignment-service.ts` - Assignment CRUD + `getAvailableBdmNames()`
- `/lib/report-service.ts` - `applyAuthFilters()` filters by `bdm_name`
- `/supabase/migrations/20260206_create_bdm_retailer_assignments.sql` - Creates `user_bdm_assignments` table

## Working with v0
This project uses v0.dev for UI design changes. Workflow:
1. v0 makes design changes → commits to GitHub
2. Claude makes functionality changes → commits to GitHub
3. Always finish one tool's changes before switching
4. Vercel auto-deploys on every push

## Common Tasks

### Trigger manual sync
POST to `/api/sync` or hit `/api/cron/sync` with CRON_SECRET header

### Add a new user
Admin panel at `/admin/users` or directly in Supabase Dashboard

### Check sync status
GET `/api/sync?action=status`

## Sprint Status

### Sprint 1 (P0) - COMPLETED
- [x] P0-1: BDM Data Isolation (Critical Security)
- [x] P0-2: Excel XLSX Export
- [x] P0-3: Sync Status Visibility
- [x] P0-4: Empty State Handling
- [x] P0-5: Error Recovery

### Sprint 2 (P1) - PENDING
- [ ] P1-1: Dashboard KPIs (totals, averages, trends)
- [ ] P1-2: Period Comparison (vs previous period)
- [ ] P1-3: Server-Side Report Aggregation
- [ ] P1-4: Request Validation (zod schemas)
- [ ] P1-5: Accessibility Improvements

## Troubleshooting

### Auth: "Login successful but redirects back to login"
**Root Cause**: `@supabase/ssr` version too old (v0.1.0 had broken cookie handling)
**Fix**: Upgrade to v0.5.0+ - the newer version automatically handles browser-to-server cookie sync
**Prevention**: Always check Supabase package versions first when debugging auth issues

### Auth: "PKCE code verifier not found"
**Cause**: Server-side route handler can't access localStorage where PKCE verifier is stored
**Fix**: Use client-side callback page for magic links (tokens come in URL hash fragment)

### Auth: Microsoft SafeLinks consuming tokens
**Cause**: Corporate email security scans links before delivery, consuming one-time tokens
**Fix**: Tokens in hash fragments survive SafeLinks; ensure callback reads from `window.location.hash`

## Known Issues / Technical Debt

### User Tables Inconsistency (P2)
The admin UI and auth middleware use different tables:
- **Admin routes** (`/api/admin/users/*`): Query a `users` table with single `retailer` field
- **Auth middleware** (`/lib/middleware/auth.ts`): Query `profiles` table + `bdm_retailer_assignments`

**Impact:** Single retailer in admin UI vs multi-retailer in auth system
**Future Fix:** Unify on `profiles` table + `bdm_retailer_assignments` for multi-retailer support

## Recent Changes (2026-02-07)

### Session: Fix Salesforce Sync and Dashboard Issues

**Problem Summary:**
1. Record count discrepancy: SOQL returning 157k records vs 222k+ expected
2. Dashboard showing 1,000 applications instead of 157k synced
3. Report Builder filters showing "No options available. Run a sync first."

**Root Causes Identified:**

1. **SOQL WHERE clause filtering**: Query had `WHERE Active__c = true` excluding ~65k inactive records
2. **Supabase default 1000 row limit**: All `.select()` calls without explicit `.limit()` only return 1000 rows
3. **Same limit issue**: Filter options and dashboard stats were all capped at 1000 rows

**Fixes Applied:**

1. **`/lib/salesforce.ts`** (line 339):
   - Removed `WHERE Active__c = true` from SOQL query
   - Now fetches ALL Application_Decision__c records regardless of active status

2. **`/lib/report-service.ts`** - Multiple fixes:
   - **`generateReport()`** (line 36): Added `.limit(500000)` to bypass default 1000 limit
   - **`getFilterOptions()`** (line 312): Added `.limit(500000)` to `buildQuery()` function
   - **`getDashboardStats()`** (lines 424-474): Complete rewrite:
     - Uses `{ count: 'exact', head: true }` for accurate total count
     - Added `.limit(500000)` to status and totals queries

**Commits:**
- `1c5c695` - fix: Resolve record count and query limit issues (2026-02-07)
- `ffe0fe2` - docs: Update Salesforce field documentation with verified paths
- `562d15b` - fix: Use correct Salesforce field paths (verified via MCP)
- `d089f35` - docs: Update Salesforce field documentation with correct mappings
- `88f3070` - fix: Resolve Salesforce sync issues - SOQL fields and null IDs
- `d45fb77` - fix: Remove /* */ comments from SOQL query
- `06591a9` - feat: Refactor data isolation from retailer to BDM name filtering

**Testing Required:**
1. Trigger a new sync - should fetch 220k+ records (not 157k)
2. Check dashboard - should show actual total count (not 1,000)
3. Test Report Builder - filters should populate with all available options

**Excel Data Analysis (uploaded file):**
- Excel export was truncated at 100k rows (Salesforce export limit)
- Contains 27 columns including BDM Name, Lender, Retailer, dates, amounts
- 17 unique BDM names, 7 lenders
- Date range: 2023-01-12 to 2026-02-07

### Previous Session: BDM Data Isolation Refactor

**Change:** Switched from retailer-based filtering to BDM name filtering
- Users now assigned to specific BDM names (not retailers)
- `user_bdm_assignments` table stores `user_email` → `bdm_name` mappings
- BDM data comes from `Retailer__r.Owner.Name` (Account Owner is the BDM)
- Created SQL migration: `/supabase/migrations/20260206_create_bdm_retailer_assignments.sql`

### Previous Session: SOQL Field Discovery (via Salesforce MCP)

**Key Discoveries:**
- BDM Name: `Retailer__r.Owner.Name` (NOT `BDM_Name__c`)
- Commission: `Application__r.Opportunity__r.Shermin_Commission_Amount__c`
- Finance Product: `Application__r.Opportunity__r.Finance_Product2__c`
- SOQL doesn't support `/* */` comments (only `//` line comments)

## Notes
- UK locale throughout (dates, currency)
- Email domain: @sherminfinance.co.uk
- All mock/placeholder data has been removed
- Legacy auth files (lib/auth.ts, lib/db.ts) have been deleted
- Always update pnpm-lock.yaml when changing package.json (Vercel uses frozen lockfile)
