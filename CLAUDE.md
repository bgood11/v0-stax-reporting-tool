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
- Callback handled client-side at `/app/auth/callback/page.tsx` (PKCE flow)

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

## Notes
- UK locale throughout (dates, currency)
- Email domain: @sherminfinance.co.uk
- All mock/placeholder data has been removed
- Legacy auth files (lib/auth.ts, lib/db.ts) have been deleted
