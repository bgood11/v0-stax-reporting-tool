# BDM Data Isolation - Quick Start Guide

## What Changed?

The system now enforces row-level security for BDM users. BDMs can only see data from retailers they're assigned to.

## Files Created/Modified

### New Files
```
lib/middleware/auth.ts
lib/bdm-assignment-service.ts
lib/__tests__/bdm-isolation.test.ts
app/api/admin/bdm-assignments/route.ts
supabase/migrations/20260206_create_bdm_retailer_assignments.sql
docs/BDM_DATA_ISOLATION.md (comprehensive guide)
docs/BDM_QUICK_START.md (this file)
```

### Modified Files
```
lib/report-service.ts (added auth context parameter)
app/api/reports/generate/route.ts (extract and pass auth context)
app/api/filters/options/route.ts (extract and pass auth context)
lib/sync-service.ts (added auth context parameter)
```

## How to Use

### 1. Extract Auth Context in API Routes

```typescript
import { getAuthContext } from '@/lib/middleware/auth';

// In your route handler:
const authContext = await getAuthContext(); // throws 401/403 on failure

if (authContext.isBdm) {
  console.log('BDM user, assigned to:', authContext.assignedRetailers);
}
```

### 2. Pass Auth Context to Data Functions

```typescript
import { generateReport } from '@/lib/report-service';

// Pass auth context for BDM filtering
const result = await generateReport(config, userId, authContext);

// Without auth context, no filtering applied
const result = await generateReport(config, userId);
```

### 3. Check If User Can Access Data

```typescript
import { isRetailerAccessible, getRetailerFilterForUser } from '@/lib/middleware/auth';

const canAccess = isRetailerAccessible('Retailer A', authContext);
// true if user is admin OR BDM with assignment

const filterList = getRetailerFilterForUser(authContext);
// null for admins (no filter)
// ['Retailer A', 'Retailer B'] for assigned BDMs
// [] for BDM with no assignments
```

## Database Setup

Run this migration in Supabase SQL Editor:

```sql
-- Copy from: /supabase/migrations/20260206_create_bdm_retailer_assignments.sql
-- Paste and execute in SQL Editor
```

## Assign Retailers to BDM

### Via API

```bash
curl -X POST http://localhost:3000/api/admin/bdm-assignments \
  -H "Content-Type: application/json" \
  -d '{
    "userEmail": "john.bdm@company.com",
    "retailers": ["Retailer A", "Retailer B"]
  }'
```

### Via SQL

```sql
INSERT INTO bdm_retailer_assignments (user_email, retailer_name)
VALUES
  ('john.bdm@company.com', 'Retailer A'),
  ('john.bdm@company.com', 'Retailer B');
```

## Test It

### As BDM User
1. Login with BDM account
2. Open Report Builder
3. **Only assigned retailers** appear in dropdown
4. Report shows **only assigned retailer** data

### As Admin
1. Login with admin account
2. Open Report Builder
3. **All retailers** appear in dropdown
4. Report shows **all data**

## Error Codes

| Status | Meaning | Cause |
|--------|---------|-------|
| 401 | Not authenticated | No valid session |
| 403 | Forbidden | User profile not found or insufficient permissions |

## Common Patterns

### Query Synced Data with Auth Filter

```typescript
import { getSyncedData } from '@/lib/sync-service';
import { getAuthContext } from '@/lib/middleware/auth';

const authContext = await getAuthContext();
const data = await getSyncedData(100, authContext);
// For BDM: only returns their assigned retailers
// For admin: returns any retailer
```

### Get Filter Options Filtered to User Access

```typescript
import { getFilterOptions } from '@/lib/report-service';
import { getAuthContext } from '@/lib/middleware/auth';

const authContext = await getAuthContext();
const options = await getFilterOptions(authContext);
// options.retailers = assigned retailers (for BDM) or all (for admin)
// Other filters also filtered by available retailers
```

### Generate Report for BDM

```typescript
import { generateReport } from '@/lib/report-service';
import { getAuthContext } from '@/lib/middleware/auth';

try {
  const authContext = await getAuthContext();
  const result = await generateReport(config, userId, authContext);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json(result.data);
} catch (error: any) {
  // 401: Not authenticated
  // 403: Profile not found
  return NextResponse.json({ error: error.message }, { status: 403 });
}
```

## Admin API Reference

### List All Assignments
```bash
GET /api/admin/bdm-assignments
```

### List Assignments for Specific User
```bash
GET /api/admin/bdm-assignments?userEmail=john@example.com
```

### Update Assignments (Replace)
```bash
POST /api/admin/bdm-assignments
{
  "userEmail": "john@example.com",
  "retailers": ["Retailer A", "Retailer B"]
}
```

## Security Notes

1. **Always call `getAuthContext()`** before accessing user-specific data
2. **Always pass `authContext`** to data functions that need it
3. **Auth filters happen server-side**, not in the frontend
4. **Admin users bypass all filtering** - intentional for admin functionality
5. **Retailers are case-sensitive** - "Retailer A" ≠ "retailer a"

## Debugging

### Check BDM Assignments

```sql
-- View all assignments
SELECT * FROM bdm_retailer_assignments;

-- View for specific user
SELECT * FROM bdm_retailer_assignments
WHERE user_email = 'john@example.com';

-- Check if retailer is assigned
SELECT * FROM bdm_retailer_assignments
WHERE user_email = 'john@example.com'
  AND retailer_name = 'Retailer A';
```

### Check User Role

```sql
SELECT email, role FROM profiles
WHERE email = 'john@example.com';
```

### Test Data Filter Logic

```sql
-- See all retailers BDM can access
SELECT DISTINCT retailer_name
FROM application_decisions
WHERE retailer_name IN (
  SELECT retailer_name
  FROM bdm_retailer_assignments
  WHERE user_email = 'john@example.com'
);
```

## What to Test

- [ ] BDM login → sees filtered dropdown
- [ ] BDM report → only assigned retailers in results
- [ ] Admin login → sees all data
- [ ] Unauthenticated → gets 401
- [ ] User without profile → gets 403
- [ ] Assignment API → requires admin role
- [ ] Multi-retailer BDM → all assignments respected
- [ ] BDM with no assignments → empty results
- [ ] Date/status filters + BDM filters → both applied

## Migration Checklist

- [ ] Deploy code changes
- [ ] Run database migration (create table)
- [ ] Test with BDM user
- [ ] Test with admin user
- [ ] Assign first batch of retailers to BDMs
- [ ] Monitor for issues
- [ ] Roll out to all BDMs

## Questions?

See `/docs/BDM_DATA_ISOLATION.md` for comprehensive documentation.
