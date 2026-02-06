# Stax Reporting Tool - Enhancement PRD v2.0

**Created**: 6 February 2026
**Author**: Barney Goodman (via Claude)
**Status**: READY FOR IMPLEMENTATION
**Version**: 2.0

---

## Problem Statement

The Stax Reporting Tool has reached functional MVP status (v1.0) with working Salesforce sync, Supabase auth, and basic report generation. However, user experience gaps, missing features, and a critical security issue limit its production readiness. BDM users can theoretically access data outside their assigned retailers, Excel export is missing (a dealbreaker for finance workflows), and the dashboard lacks actionable insights. Without these enhancements, user adoption will be limited and the tool won't deliver on its promise of replacing manual Salesforce report exports.

---

## Goals

1. **Security**: Implement row-level BDM data isolation with 100% enforcement within 1 sprint
2. **Adoption**: Achieve 80%+ user preference for the tool over manual Salesforce exports within 30 days of launch
3. **Efficiency**: Reduce average time-to-report from 15+ minutes (manual) to under 2 minutes
4. **Reliability**: Zero silent sync failures - all errors visible to users with actionable recovery options
5. **Completeness**: Deliver scheduled reports capability enabling hands-off daily/weekly report generation

---

## Non-Goals

1. **Real-time Salesforce sync** - Daily sync is sufficient; real-time adds complexity without proportional value
2. **Custom dashboard widgets** - Fixed dashboard layout for v2; user customisation deferred to v3
3. **Multi-tenant architecture** - Single-tenant for Shermin only; no need to support other orgs
4. **Mobile-first redesign** - Responsive tweaks only; this is primarily a desktop business tool
5. **Salesforce write-back** - Read-only tool; no updates to Salesforce from this app

---

## User Stories

### Admin Users (Barney, Tony, Gareth)

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| A1 | As an admin, I want to see a dashboard with KPIs and trends so I can quickly assess business health | KPI cards show: Total Volume, Loan Value, Approval Rate, Execution Rate. Each has trend indicator (↑/↓) vs prior period |
| A2 | As an admin, I want to export reports to Excel so I can manipulate data in familiar tools | One-click XLSX download with proper formatting, headers, and data types |
| A3 | As an admin, I want to schedule reports so I receive them automatically without manual generation | Configure daily/weekly/monthly email delivery with preset filters |
| A4 | As an admin, I want period-over-period comparison so I can identify trends | Side-by-side comparison: This Month vs Last Month, This Quarter vs Last Quarter, YoY |
| A5 | As an admin, I want to manage users so I can control access | Add/remove users, assign roles (Admin/BDM), view last login |
| A6 | As an admin, I want visible sync status so I know data freshness | Dashboard shows: last sync time, records synced, next scheduled sync |
| A7 | As an admin, I want alerting when metrics cross thresholds so I can respond proactively | Configure alerts: e.g., "Notify me if approval rate drops below 60%" |

### BDM Users

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| B1 | As a BDM, I want to see only my assigned retailers so I don't see competitors' data | BDM sees only retailers linked to them in Salesforce; no data leakage |
| B2 | As a BDM, I want my dashboard pre-filtered to my portfolio so I see relevant data immediately | Dashboard auto-filters to BDM's retailers on login |
| B3 | As a BDM, I want to save report presets so I can quickly re-run common reports | Save/load custom filter combinations with names |
| B4 | As a BDM, I want helpful empty states so I know what to do when there's no data | Contextual messages: "No applications in this date range. Try expanding your dates." |

---

## Requirements

### P0 - Must Have (Sprint 1)

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| P0-1 | **BDM Data Isolation** | Server-side filtering based on authenticated user's BDM_Name__c assignments. BDM cannot access any retailer not assigned to them. Unit tests covering edge cases. |
| P0-2 | **Excel Export** | Generate .xlsx file via SheetJS. Include: headers with filters, proper number/date formatting, summary row with totals. File downloads within 5 seconds for 10k rows. |
| P0-3 | **Sync Status Visibility** | Dashboard widget showing: last sync timestamp, status (success/failed), record count. If failed: error message + "Retry" button. |
| P0-4 | **Empty State Handling** | All tables/charts show contextual empty states. Include: friendly message, suggested action (adjust filters, expand date range). Never show raw "null" or blank screens. |
| P0-5 | **Error Recovery** | All API errors show user-friendly messages. Include retry option where applicable. Log errors to console for debugging. Never show raw stack traces. |

### P1 - Should Have (Sprint 2)

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| P1-1 | **Dashboard KPIs** | 4 KPI cards: Volume, Loan Value, Approval Rate, Execution Rate. Each shows: current value, change vs prior period (%), trend arrow (↑/↓/→). |
| P1-2 | **Period Comparison** | Report builder option to compare two periods. Display: side-by-side columns, variance column (absolute + %), highlight significant changes. |
| P1-3 | **Server-Side Aggregation** | Move all metric calculations from client to API. Implement pre-computed daily summaries table. Target: <500ms response time for dashboard. |
| P1-4 | **Request Validation** | Validate all API inputs: date formats, enum values, array lengths. Return 400 with specific error messages for invalid requests. |
| P1-5 | **Accessibility Improvements** | Status indicators use colour + icon (not colour alone). All interactive elements have focus states. Sufficient colour contrast (WCAG AA). |

### P2 - Nice to Have (Sprint 3+)

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| P2-1 | **Scheduled Reports** | Admin can schedule reports: daily/weekly/monthly. Email delivered with PDF attachment and summary. Manage active schedules from UI. |
| P2-2 | **Alerting System** | Configure threshold alerts: metric + condition + value. Notify via email when triggered. Dashboard shows active alerts. |
| P2-3 | **User Onboarding** | First-login walkthrough: 5 steps highlighting key features. Can dismiss and re-access from Help menu. Track completion status. |
| P2-4 | **Mobile Table Improvements** | Tables on mobile: horizontal scroll with sticky first column, OR card-based layout for narrow screens. |
| P2-5 | **Saved Report Presets** | Users can save/name filter combinations. Built-in presets for common reports. Share presets between users. |
| P2-6 | **Audit Logging** | Log: user, action, timestamp for all data access and exports. Admin can view audit log. Supports compliance requirements. |

---

## Success Metrics

### Leading Indicators (measure weekly)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Report generation count | 50+ reports/week | Database query on generated_reports |
| Average time-to-report | <2 minutes | Track from page load to export click |
| Error rate | <1% of requests | API error logging |
| User sessions/week | 10+ unique users | Supabase auth analytics |

### Lagging Indicators (measure monthly)

| Metric | Target | Measurement |
|--------|--------|-------------|
| User satisfaction | >4.0/5.0 rating | In-app feedback widget |
| Manual Salesforce exports | 80% reduction | Compare to baseline month |
| Support tickets | <5/month | Track Jira/email requests |
| Time saved per user | >2 hours/week | User survey |

---

## Open Questions

| Question | Owner | Status |
|----------|-------|--------|
| How is BDM-to-Retailer assignment stored in Salesforce? | Barney | **Need to confirm field name** |
| Should scheduled reports include raw data or summary only? | Barney | Open |
| What's the maximum historical date range to support? | Barney | Open |
| Should BDMs be able to see each other's names in dropdowns? | Barney | Open |
| Email service for scheduled reports - Resend or different? | Barney | Open |

---

## Timeline & Phasing

### Sprint 1 (Week 1-2): Security & Foundation
- P0-1: BDM Data Isolation ⚠️ **CRITICAL**
- P0-2: Excel Export
- P0-3: Sync Status Visibility
- P0-4: Empty State Handling
- P0-5: Error Recovery

### Sprint 2 (Week 3-4): Dashboard & Performance
- P1-1: Dashboard KPIs
- P1-2: Period Comparison
- P1-3: Server-Side Aggregation
- P1-4: Request Validation
- P1-5: Accessibility Improvements

### Sprint 3 (Week 5-6): Advanced Features
- P2-1: Scheduled Reports
- P2-2: Alerting System
- P2-3: User Onboarding
- P2-4: Mobile Table Improvements

### Sprint 4 (Week 7-8): Polish & Launch
- P2-5: Saved Report Presets
- P2-6: Audit Logging
- Final testing & bug fixes
- Documentation & training

---

## Technical Architecture Notes

### BDM Data Isolation Implementation

```
┌─────────────────────────────────────────────────────────────┐
│                    AUTH MIDDLEWARE                           │
├─────────────────────────────────────────────────────────────┤
│  1. Get authenticated user from Supabase session            │
│  2. Lookup user role in users table                         │
│  3. If role = 'bdm':                                        │
│     - Fetch assigned retailers from bdm_assignments table   │
│     - Inject retailer filter into ALL data queries          │
│  4. If role = 'admin':                                      │
│     - No additional filters (full access)                   │
└─────────────────────────────────────────────────────────────┘
```

### Database Changes Required

```sql
-- New table for BDM assignments
CREATE TABLE bdm_retailer_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bdm_user_id UUID REFERENCES auth.users(id),
  retailer_name TEXT NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(bdm_user_id, retailer_name)
);

-- Pre-computed daily summaries for performance
CREATE TABLE daily_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  summary_date DATE NOT NULL,
  retailer_name TEXT,
  lender_name TEXT,
  total_volume INT,
  total_loan_value DECIMAL(15,2),
  approved_count INT,
  declined_count INT,
  signed_count INT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(summary_date, retailer_name, lender_name)
);

-- Scheduled reports configuration
CREATE TABLE scheduled_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  config JSONB NOT NULL,
  frequency TEXT CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  next_run_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Audit log for compliance
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  metadata JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Agent Implementation Plan

### Coordination Structure

```
┌─────────────────────────────────────────────────────────────┐
│                    LEAD AGENT (Coordinator)                  │
│  - Assigns tasks to specialist agents                        │
│  - Reviews completed work                                    │
│  - Manages git commits and sync                              │
│  - Ensures consistency across changes                        │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│ AGENT 1       │ │ AGENT 2       │ │ AGENT 3       │
│ Backend/API   │ │ Frontend/UX   │ │ Testing/QA    │
│               │ │               │ │               │
│ - Data layer  │ │ - Components  │ │ - Unit tests  │
│ - API routes  │ │ - UI/UX      │ │ - Integration │
│ - Security    │ │ - Styling     │ │ - Code review │
└───────────────┘ └───────────────┘ └───────────────┘
```

### Implementation Order

| # | Feature | Lead Agent | Supporting | Est. Hours |
|---|---------|------------|------------|------------|
| 1 | BDM Data Isolation | Backend | QA | 4h |
| 2 | Excel Export | Backend | Frontend | 3h |
| 3 | Sync Status Widget | Frontend | Backend | 2h |
| 4 | Empty States | Frontend | - | 2h |
| 5 | Error Handling | Backend | Frontend | 2h |
| 6 | Dashboard KPIs | Frontend | Backend | 4h |
| 7 | Period Comparison | Full Stack | QA | 4h |
| 8 | Server-Side Aggregation | Backend | QA | 3h |
| 9 | Scheduled Reports | Backend | Frontend | 6h |
| 10 | Alerting | Backend | Frontend | 4h |

---

## Appendix: Agent Task Specifications

### Task 1: BDM Data Isolation

**Objective**: Implement row-level security so BDM users only see their assigned retailers.

**Files to modify**:
- `/lib/middleware/auth.ts` (new)
- `/lib/sync-service.ts`
- `/app/api/reports/generate/route.ts`
- `/app/api/filters/options/route.ts`

**Acceptance tests**:
1. BDM user queries data → only sees assigned retailers
2. BDM user cannot access admin endpoints
3. Admin user sees all data
4. Unauthenticated request returns 401

### Task 2: Excel Export

**Objective**: Add XLSX export capability using SheetJS.

**Files to modify**:
- `/lib/export.ts` (new)
- `/app/api/reports/export/route.ts` (new)
- `/components/reports/report-results.tsx`

**Dependencies**: `npm install xlsx`

**Acceptance tests**:
1. Export button generates valid .xlsx file
2. File contains correct headers and data
3. Numbers formatted correctly (not strings)
4. Dates formatted as DD/MM/YYYY
5. Export completes in <5s for 10k rows

### Task 3-10: [Similar specifications for remaining tasks]

---

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Product Owner | Barney Goodman | | |
| Tech Lead | Claude (AI) | 6 Feb 2026 | ✓ |
| Stakeholder | | | |

---

*Document location: `/Salesforce Reporting Tool Build/PRD-ENHANCEMENTS-V2.md`*
