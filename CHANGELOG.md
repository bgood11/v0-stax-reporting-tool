# Changelog

All notable changes to the Stax Salesforce Reporting Tool.

## [Unreleased]

### Fixed - 2026-02-07 (Session 2)
- **SOQL record count**: Removed `WHERE Active__c = true` filter that was excluding ~65k inactive records
- **Dashboard totals**: Fixed Supabase default 1000 row limit by adding `.limit(500000)`
- **Dashboard count**: Now uses `{ count: 'exact', head: true }` for accurate total application count
- **Report Builder filters**: Fixed empty filter dropdowns by adding `.limit(500000)` to `getFilterOptions()`
- **Report generation**: Added `.limit(500000)` to prevent truncated report results

### Changed - 2026-02-07 (Session 1)
- **Data isolation model**: Refactored from retailer-based to BDM name-based filtering
- **User assignments**: Users now assigned to BDM names (from `bdm_name` field) instead of retailers
- **Auth context**: Added `assignedBdmNames` and `hasFullAccess` to AuthContext

### Fixed - 2026-02-07 (Session 1)
- **SOQL comments**: Removed `/* */` comments (SOQL only supports `//` line comments)
- **SOQL field paths**: Corrected invalid field references:
  - `BDM_Name__c` → `Retailer__r.Owner.Name`
  - `Shermin_Commission_Amount__c` → `Application__r.Opportunity__r.Shermin_Commission_Amount__c`
- **Null ID handling**: Added `generateSyntheticId()` fallback for Reports API records
- **Reports API field mapping**: Updated `transformRecord()` to use exact field names like `Account.Owner.Name`

### Added - 2026-02-07
- **BDM assignment table**: Created `user_bdm_assignments` table for user-to-BDM mappings
- **Assignment API**: New endpoints for managing BDM assignments:
  - GET `/api/admin/bdm-assignments?action=available`
  - GET `/api/admin/bdm-assignments?userEmail=xxx`
  - POST `/api/admin/bdm-assignments`
- **Salesforce describe endpoint**: `/api/salesforce/describe` for field discovery

## Git Commits (Recent)

```
1c5c695 fix: Resolve record count and query limit issues
ffe0fe2 docs: Update Salesforce field documentation with verified paths
562d15b fix: Use correct Salesforce field paths (verified via MCP)
d089f35 docs: Update Salesforce field documentation with correct mappings
88f3070 fix: Resolve Salesforce sync issues - SOQL fields and null IDs
d45fb77 fix: Remove /* */ comments from SOQL query
06591a9 feat: Refactor data isolation from retailer to BDM name filtering
```

## Key Technical Details

### Salesforce Data Model
```
Application_Decision__c
  ├── Application__c (via Application__r)
  │     └── Opportunity (via Opportunity__r)
  │           ├── Shermin_Commission_Amount__c
  │           └── Finance_Product2__c
  └── Retailer__c (Account via Retailer__r)
        └── Owner (User)
              └── Name (BDM Name!)
```

### Correct SOQL Field Paths
- BDM Name: `Retailer__r.Owner.Name`
- Commission: `Application__r.Opportunity__r.Shermin_Commission_Amount__c`
- Finance Product: `Application__r.Opportunity__r.Finance_Product2__c`
- Loan Amount: `Loan_Amount__c` (direct on AD)
- Lender: `Lender_Name__c` or `Lender__r.Name`

### Supabase Query Limits
**IMPORTANT**: Supabase defaults to 1000 rows when using `.select()` without explicit `.limit()`.
Always add `.limit(500000)` for queries that need all records, or use `{ count: 'exact', head: true }` for counts.

### Files Modified in Recent Sessions
- `/lib/salesforce.ts` - SOQL query, transform functions
- `/lib/report-service.ts` - Dashboard stats, filter options, report generation
- `/lib/sync-service.ts` - Sync orchestration, ID validation
- `/lib/middleware/auth.ts` - AuthContext with BDM assignments
- `/lib/bdm-assignment-service.ts` - BDM assignment CRUD
- `/supabase/migrations/20260206_create_bdm_retailer_assignments.sql` - New table

## Testing Checklist

After deploying these changes:

1. [ ] **Sync Test**: Trigger new sync, verify 220k+ records (not 157k)
2. [ ] **Dashboard Test**: Check total applications shows actual count (not 1,000)
3. [ ] **Filter Test**: Verify Report Builder dropdowns populate with options
4. [ ] **Report Test**: Generate a report, verify all matching records included
5. [ ] **BDM Filtering Test**: Log in as non-admin user, verify data isolation works
