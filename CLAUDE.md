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
- **Daily cron job** at 1am syncs Salesforce → Supabase
- Route: `/app/api/cron/sync/route.ts`
- Service: `/lib/sync-service.ts`
- Salesforce client: `/lib/salesforce.ts`
- Uses SOQL queries (no 2,000 row limit), falls back to Reports API

### Key Salesforce Fields
- `BDM_Name__c` - Business Development Manager name
- `Shermin_Commission_Amount__c` - Commission amount
- Primary object: `Application_Decision__c`

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
- `bdm` - Can view their own retailers only
- `viewer` - Read-only access

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

## Notes
- UK locale throughout (dates, currency)
- Email domain: @sherminfinance.co.uk
- All mock/placeholder data has been removed
- Legacy auth files (lib/auth.ts, lib/db.ts) have been deleted
- Always update pnpm-lock.yaml when changing package.json (Vercel uses frozen lockfile)
