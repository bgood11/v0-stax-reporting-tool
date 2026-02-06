# Error Recovery System (P0-5)

## Overview

The Stax Reporting Tool now implements comprehensive error handling with:
- User-friendly error messages (no raw stack traces)
- Proper HTTP status codes
- Automatic retry capabilities for recoverable errors
- Console logging for debugging
- Frontend error display components

## Architecture

### Backend Error Handling

#### Error Handler Utility (`lib/error-handler.ts`)

Core error handling with standardized `AppError` interface:

```typescript
interface AppError {
  code: ErrorCode;           // Machine-readable error type
  message: string;           // Technical message (for logs)
  userMessage: string;       // User-friendly message (for UI)
  retryable: boolean;        // Can user retry this action?
  statusCode: number;        // HTTP status code
  details?: Record<string, any>; // Additional debugging info
}
```

**Supported Error Codes:**

| Code | HTTP Status | Retryable | Use Case |
|------|-----------|-----------|----------|
| VALIDATION_ERROR | 400 | No | Invalid input/missing required fields |
| AUTH_ERROR | 401 | No | User not authenticated or session expired |
| FORBIDDEN | 403 | No | User lacks permission |
| NOT_FOUND | 404 | No | Resource doesn't exist |
| RATE_LIMITED | 429 | Yes | Too many requests to API |
| SERVER_ERROR | 500 | Yes | Unexpected server error |
| SALESFORCE_ERROR | 502 | Yes | Salesforce connection failure |
| SYNC_FAILED | 503 | Yes | Data sync failure |
| NETWORK_ERROR | 503 | Yes | Network connectivity issue |
| PARSE_ERROR | 500 | Yes | Failed to parse response |

#### Error Response Helper (`lib/error-response.ts`)

Creates standardized JSON responses for API errors:

```typescript
// Never exposes technical details to client
{
  "error": "Your session has expired. Please sign in again.",
  "code": "AUTH_ERROR",
  "retryable": false
}
```

**Available Response Creators:**

- `createErrorResponse(error, context)` - Generic error response
- `createAuthErrorResponse(context)` - Auth error
- `createForbiddenErrorResponse(context)` - Permission error
- `createValidationErrorResponse(message, context)` - Validation error

### API Route Integration

#### Updated Routes

All API routes follow this pattern:

```typescript
import { createError, logError } from '@/lib/error-handler';
import { createErrorResponse } from '@/lib/error-response';

const CONTEXT = 'route/name'; // For logging

export async function POST(request: NextRequest) {
  try {
    // Validate input
    const validationError = validateReportInput(body);
    if (validationError) {
      return createErrorResponse(validationError, CONTEXT);
    }

    // Process request
    const result = await processRequest(data);

    if (!result.success) {
      const error = createError('SERVER_ERROR', result.error);
      return createErrorResponse(error, CONTEXT);
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return createServerErrorResponse(error, CONTEXT);
  }
}
```

**Updated Routes:**
- `/app/api/reports/generate/route.ts` - Report generation
- `/app/api/sync/route.ts` - Salesforce data sync
- `/app/api/filters/options/route.ts` - Filter options

### Frontend Error Handling

#### Error Message Components (`components/ui/error-message.tsx`)

**ErrorMessage - Full Error Display**

```typescript
<ErrorMessage
  error="Unable to sync data from Salesforce. Click retry to try again."
  code="SYNC_FAILED"
  retryable={true}
  onRetry={handleRetry}
  onDismiss={handleDismiss}
  showSupport={true}
/>
```

Features:
- Error icon with clear messaging
- Retry button if `retryable=true`
- Contact support link
- Dismissible with close button

**InlineErrorMessage - Compact Version**

For forms and modals:

```typescript
<InlineErrorMessage
  error="Please select at least one filter."
  onDismiss={() => setError(null)}
/>
```

**ErrorToast - Notification Style**

```typescript
<ErrorToast
  error="Sync failed. Retrying..."
  retryable={true}
  onRetry={handleRetry}
  autoClose={true}
  autoCloseDuration={5000}
/>
```

#### useErrorHandler Hook (`hooks/useErrorHandler.ts`)

Provides error management and retry logic:

```typescript
function MyComponent() {
  const { error, isLoading, execute, retry } = useErrorHandler({
    maxRetries: 3,
    baseDelay: 1000, // exponential backoff starting at 1s
    onError: (error) => console.log('Error:', error),
  });

  const generateReport = async () => {
    const result = await execute(
      () => fetch('/api/reports/generate', {
        method: 'POST',
        body: JSON.stringify({ /* config */ })
      }),
      (response) => response.json()
    );

    if (result) {
      // Use result
    }
  };

  return (
    <div>
      {error && (
        <ErrorMessage
          error={error.error}
          code={error.code}
          retryable={error.retryable}
          onRetry={() => retry(generateReport)}
        />
      )}
      <button onClick={generateReport} disabled={isLoading}>
        Generate Report
      </button>
    </div>
  );
}
```

#### useApi Hook

Simplified hook for common API patterns:

```typescript
function MyComponent() {
  const { data, error, isLoading, fetch, refetch } = useApi<ReportData>(
    '/api/reports/generate',
    { maxRetries: 3 }
  );

  const handleGenerate = async () => {
    await fetch('POST', { /* config */ });
  };

  return (
    <div>
      {error && (
        <ErrorMessage
          error={error.error}
          retryable={error.retryable}
          onRetry={() => refetch('POST', { /* config */ })}
        />
      )}
      {data && <ReportDisplay data={data} />}
      <button onClick={handleGenerate} disabled={isLoading}>
        Generate
      </button>
    </div>
  );
}
```

## Error Messages

### Validation Errors

**Input:** Missing required filters
**Message:** "Please select at least one filter to generate a report."
**Code:** VALIDATION_ERROR
**Retryable:** No
**Status:** 400

### Authentication Errors

**Input:** Expired session
**Message:** "Your session has expired. Please sign in again."
**Code:** AUTH_ERROR
**Retryable:** No
**Status:** 401

### Permission Errors

**Input:** User lacks access
**Message:** "You do not have permission to access this resource."
**Code:** FORBIDDEN
**Retryable:** No
**Status:** 403

### Rate Limiting

**Input:** Too many API requests
**Message:** "Too many requests. Please wait a moment and try again."
**Code:** RATE_LIMITED
**Retryable:** Yes
**Status:** 429

### Salesforce Sync Errors

**Input:** Sync failure
**Message:** "Unable to sync data from Salesforce. Click retry to try again."
**Code:** SYNC_FAILED
**Retryable:** Yes
**Status:** 503

**Input:** Invalid credentials
**Message:** "Salesforce credentials are invalid. Please contact an administrator."
**Code:** AUTH_ERROR
**Retryable:** No
**Status:** 401

### Server Errors

**Input:** Unexpected error
**Message:** "Something went wrong on our end. Our team has been notified."
**Code:** SERVER_ERROR
**Retryable:** Yes
**Status:** 500

## Debugging

### Console Logging

All errors are logged to the browser console with full context:

```javascript
// Example console output
[reports/generate] {
  code: "SERVER_ERROR",
  message: "Database connection timeout",
  statusCode: 500,
  retryable: true,
  details: {
    errorName: "TimeoutError",
    stack: "at Database.query (db.ts:45:12)\n..."
  }
}
```

### Enabling Debug Mode

Set in browser console:

```javascript
// Log all error handler calls
window.DEBUG_ERRORS = true;
```

## Testing

### Test Validation Error

```typescript
// Request with missing filters
POST /api/reports/generate
{ "reportType": "AD" }

// Response (400)
{
  "error": "Please select at least one filter to generate a report.",
  "code": "VALIDATION_ERROR",
  "retryable": false
}
```

### Test Salesforce Error

```typescript
// With invalid Salesforce credentials
POST /api/sync

// Response (502)
{
  "error": "Unable to connect to Salesforce. Please check your credentials.",
  "code": "SALESFORCE_ERROR",
  "retryable": true
}
```

### Test Retry Logic

```typescript
// Use the ErrorToast component
<ErrorToast
  error="Network timeout. Retrying..."
  retryable={true}
  onRetry={async () => {
    // Will retry with exponential backoff
    const response = await fetch('/api/sync', { method: 'POST' });
  }}
/>
```

## Migration Guide

### Updating Existing Routes

**Before:**

```typescript
try {
  const result = await generateReport(config);
  return NextResponse.json(result);
} catch (error: any) {
  console.error('Report error:', error);
  return NextResponse.json(
    { error: error.message },
    { status: 500 }
  );
}
```

**After:**

```typescript
try {
  const result = await generateReport(config);
  return NextResponse.json(result);
} catch (error: any) {
  const appError = createError(
    'SERVER_ERROR',
    error.message || 'Report generation failed',
    {
      details: { errorName: error.name }
    }
  );
  return createErrorResponse(appError, CONTEXT);
}
```

### Updating Frontend Code

**Before:**

```typescript
const response = await fetch('/api/reports/generate', { method: 'POST' });
const data = await response.json();
if (!response.ok) {
  alert(data.error);
  return;
}
```

**After:**

```typescript
const { data, error, execute } = useApi('/api/reports/generate');

const handleGenerate = async () => {
  await execute(
    () => fetch('/api/reports/generate', { method: 'POST' }),
    (res) => res.json()
  );
};

return (
  <>
    {error && <ErrorMessage error={error.error} retryable={error.retryable} />}
    <button onClick={handleGenerate}>Generate</button>
  </>
);
```

## Best Practices

1. **Always use createError** - Never create AppError manually
2. **Provide context** - Pass context string to all error responses for better logging
3. **Be specific** - Use the most specific error code available
4. **User-friendly messages** - Never expose technical details in userMessage
5. **Log full details** - Store all error context in `details` field for debugging
6. **Handle retryable errors** - Show retry button for recoverable errors
7. **Validate input early** - Catch validation errors before processing
8. **Test error paths** - Test error responses as thoroughly as success paths

## Files Changed

- Created: `/lib/error-handler.ts`
- Created: `/lib/error-response.ts`
- Created: `/components/ui/error-message.tsx`
- Created: `/hooks/useErrorHandler.ts`
- Updated: `/app/api/reports/generate/route.ts`
- Updated: `/app/api/sync/route.ts`
- Updated: `/app/api/filters/options/route.ts`
- Created: `/docs/ERROR_HANDLING.md`

## Summary

The error recovery system provides:

✓ User-friendly error messages
✓ Proper HTTP status codes
✓ Automatic retry for recoverable errors
✓ Detailed console logging
✓ No raw stack traces shown to users
✓ Reusable error components
✓ Standardized error interface
✓ Salesforce error handling
