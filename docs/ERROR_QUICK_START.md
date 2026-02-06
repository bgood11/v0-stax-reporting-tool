# Error Recovery Quick Start Guide

## For Backend Developers

### Step 1: Add Error Handling to Your API Route

```typescript
import { createError } from '@/lib/error-handler';
import { createErrorResponse, createAuthErrorResponse } from '@/lib/error-response';

const CONTEXT = 'your-route-name'; // For logging

export async function POST(request: NextRequest) {
  // Verify auth
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return createAuthErrorResponse(CONTEXT);
  }

  try {
    const body = await request.json();

    // Validate
    if (!body.requiredField) {
      const error = createError('VALIDATION_ERROR', 'Field missing', {
        userMessage: 'Please provide the required field.'
      });
      return createErrorResponse(error, CONTEXT);
    }

    // Process
    const result = await doSomething(body);

    if (!result.success) {
      const error = createError('SERVER_ERROR', result.error);
      return createErrorResponse(error, CONTEXT);
    }

    return NextResponse.json(result);

  } catch (error: any) {
    const appError = createError('SERVER_ERROR', error.message);
    return createErrorResponse(appError, CONTEXT);
  }
}
```

### Step 2: Test Your Error Handling

**Test Auth Error:**
```bash
curl -X POST http://localhost:3000/api/your-endpoint \
  -H "Content-Type: application/json" \
  -d '{}'
# Expected: 401 with { error: "Your session has expired..." }
```

**Test Validation Error:**
```bash
curl -X POST http://localhost:3000/api/your-endpoint \
  -H "Content-Type: application/json" \
  -d '{}' \
  -H "Cookie: your-auth"
# Expected: 400 with validation message
```

### Step 3: Check Console Logs

Open browser DevTools console to see:
```javascript
[your-route-name] {
  code: "VALIDATION_ERROR",
  message: "Field missing",
  statusCode: 400,
  retryable: false
}
```

---

## For Frontend Developers

### Step 1: Use useApi Hook

```typescript
'use client';

import { useApi } from '@/hooks/useErrorHandler';
import { ErrorMessage } from '@/components/ui/error-message';

export function MyComponent() {
  const { data, error, isLoading, fetch, refetch } = useApi('/api/endpoint');

  const handleClick = async () => {
    await fetch('POST', { /* your data */ });
  };

  return (
    <div>
      {error && (
        <ErrorMessage
          error={error.error}
          code={error.code}
          retryable={error.retryable}
          onRetry={() => refetch('POST', { /* your data */ })}
          onDismiss={() => {
            // Handle dismiss if needed
          }}
        />
      )}

      {isLoading && <p>Loading...</p>}

      {data && <div>{/* Render your data */}</div>}

      <button onClick={handleClick} disabled={isLoading}>
        Click Me
      </button>
    </div>
  );
}
```

### Step 2: Add Error Handling to Existing Code

**Before:**
```typescript
const response = await fetch('/api/endpoint', { method: 'POST' });
const data = await response.json();
if (!response.ok) {
  alert(data.error);
  return;
}
setData(data);
```

**After:**
```typescript
const { error, execute } = useErrorHandler();

const result = await execute(
  () => fetch('/api/endpoint', { method: 'POST' }),
  (res) => res.json()
);

if (result) {
  setData(result);
}
// Error is automatically handled and displayed
```

### Step 3: Display Errors

Choose the component that fits your UI:

**Full Error Display:**
```typescript
<ErrorMessage
  error={error.error}
  code={error.code}
  retryable={error.retryable}
  onRetry={handleRetry}
  showSupport={true}
/>
```

**Inline/Form Error:**
```typescript
<InlineErrorMessage
  error={error.error}
  onDismiss={handleDismiss}
/>
```

**Toast Notification:**
```typescript
<ErrorToast
  error={error.error}
  retryable={error.retryable}
  onRetry={handleRetry}
  autoClose={true}
  autoCloseDuration={5000}
/>
```

---

## Common Error Scenarios

### Validation Error
```typescript
// User didn't fill in required field
const error = createError(
  'VALIDATION_ERROR',
  'Name is required',
  { userMessage: 'Please enter your name.' }
);
```

### Authentication Error
```typescript
// Session expired or user not logged in
return createAuthErrorResponse(CONTEXT);
// Automatically shows: "Your session has expired. Please sign in again."
```

### Permission Error
```typescript
// User doesn't have access
const error = createError('FORBIDDEN', 'User not owner');
return createErrorResponse(error, CONTEXT);
// Automatically shows: "You do not have permission..."
```

### Salesforce Error
```typescript
try {
  const result = await salesforceService.query(query);
} catch (error: any) {
  const sfError = handleSalesforceError(error);
  return createErrorResponse(sfError, CONTEXT);
}
```

### Server Error with Retry
```typescript
try {
  await longRunningOperation();
} catch (error: any) {
  const appError = createError(
    'SERVER_ERROR',
    error.message,
    { retryable: true } // Enable retry
  );
  return createErrorResponse(appError, CONTEXT);
}
```

---

## Testing Error Handling

### Frontend Test Component

```typescript
'use client';

import { useState } from 'react';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { ErrorMessage } from '@/components/ui/error-message';
import { ErrorToast } from '@/components/ui/error-message';

export function ErrorTestComponent() {
  const { error, execute, retry } = useErrorHandler({
    maxRetries: 3,
    baseDelay: 1000
  });

  const [testType, setTestType] = useState('success');

  const handleTest = async () => {
    await execute(
      async () => {
        // Simulate different responses
        if (testType === 'success') {
          return new Response(JSON.stringify({ data: 'Success!' }), {
            status: 200
          });
        } else if (testType === 'validation') {
          return new Response(
            JSON.stringify({
              error: 'Please fill in all fields',
              code: 'VALIDATION_ERROR',
              retryable: false
            }),
            { status: 400 }
          );
        } else if (testType === 'server') {
          return new Response(
            JSON.stringify({
              error: 'Server error. Please try again.',
              code: 'SERVER_ERROR',
              retryable: true
            }),
            { status: 500 }
          );
        }
      },
      (res) => res.json()
    );
  };

  return (
    <div className="p-8">
      <h2>Error Handling Test</h2>

      <div className="space-y-4">
        <select
          value={testType}
          onChange={(e) => setTestType(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="success">Success Response</option>
          <option value="validation">Validation Error</option>
          <option value="server">Server Error</option>
        </select>

        <button
          onClick={handleTest}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Test
        </button>

        {error && (
          <ErrorMessage
            error={error.error}
            code={error.code}
            retryable={error.retryable}
            onRetry={() => retry(() => handleTest())}
          />
        )}
      </div>
    </div>
  );
}
```

---

## Error Message Customization

### Default Messages
The system has built-in messages for each error type, but you can customize:

```typescript
const error = createError(
  'VALIDATION_ERROR',
  'Technical message for logs',
  {
    userMessage: 'Custom message for users',
    statusCode: 400,
    retryable: false,
    details: { field: 'email', reason: 'invalid format' }
  }
);
```

### Message Guidelines
- **Technical message**: Be specific, include details, for logging
- **User message**: Be friendly, avoid jargon, actionable
- **Details**: Include any context needed for debugging

Good ✓
```typescript
userMessage: 'Please enter a valid email address.'
message: 'Email validation failed: format does not match /^[^@]+@[^@]+$/';
```

Bad ✗
```typescript
userMessage: 'ValidationError: invalid email format'
message: 'An error occurred'
```

---

## Debugging Tips

### 1. Check Browser Console
```javascript
// All errors logged with full context
[route-name] {
  code: "ERROR_CODE",
  message: "Technical message",
  statusCode: 200,
  retryable: false,
  details: { ... }
}
```

### 2. Check Network Tab
Look at API responses to see what the backend is returning:
```json
{
  "error": "User-friendly message",
  "code": "ERROR_CODE",
  "retryable": true
}
```

### 3. Test Retry Logic
```typescript
// Simulate a retry scenario
const { error, retry, isRetrying, retryCount } = useErrorHandler();
console.log('Retry attempt:', retryCount);
console.log('Is retrying:', isRetrying);
```

### 4. Mock Errors in Tests
```typescript
// Jest/Vitest
jest.mock('@/lib/error-handler', () => ({
  createError: jest.fn((code, message) => ({
    code,
    message,
    userMessage: 'Test error',
    statusCode: 500,
    retryable: true
  }))
}));
```

---

## Troubleshooting

### "Error message not showing"
- Check that `error` state is not null
- Verify ErrorMessage component is in your JSX
- Check that `error.error` property exists (not `error.message`)

### "Retry button not working"
- Ensure `error.retryable === true`
- Verify `onRetry` callback is provided
- Check that retry callback calls the same API

### "Exponential backoff not working"
- Verify `useErrorHandler` has `baseDelay` option set
- Check that error is marked `retryable: true`
- Look at timing: 1s, 2s, 4s, 8s...

### "Raw error message showing to user"
- NEVER return `error.message` in API response
- ALWAYS use `error.userMessage`
- Check `createErrorResponse()` - it handles this automatically

---

## Quick Reference

### Error Codes
| Code | Meaning | Retryable |
|------|---------|-----------|
| VALIDATION_ERROR | Invalid input | No |
| AUTH_ERROR | Not authenticated | No |
| FORBIDDEN | No permission | No |
| NOT_FOUND | Resource missing | No |
| RATE_LIMITED | Too many requests | Yes |
| SERVER_ERROR | Unexpected error | Yes |
| SALESFORCE_ERROR | SF connection issue | Yes |
| SYNC_FAILED | Data sync issue | Yes |

### Component Selector
| Component | Use When |
|-----------|----------|
| ErrorMessage | Need full error display with actions |
| InlineErrorMessage | Inline in forms, limited space |
| ErrorToast | Toast notification, auto-dismiss |

### Hook Selector
| Hook | Use When |
|------|----------|
| useErrorHandler | Custom API logic, full control |
| useApi | Simple fetch operations, GET/POST |

---

## Next Steps

1. **Update existing routes** - See ERROR_IMPLEMENTATION_EXAMPLES.md
2. **Add error handling to components** - Use useApi hook
3. **Test error scenarios** - Use test component above
4. **Monitor errors** - Check console logs in production
5. **Gather feedback** - User experience insights

---

## Resources

- Full Documentation: `/docs/ERROR_HANDLING.md`
- Implementation Examples: `/docs/ERROR_IMPLEMENTATION_EXAMPLES.md`
- Flow Diagrams: `/docs/ERROR_FLOW_DIAGRAM.md`
- Source Code:
  - `/lib/error-handler.ts`
  - `/lib/error-response.ts`
  - `/components/ui/error-message.tsx`
  - `/hooks/useErrorHandler.ts`

---

## Support

Questions or issues?
1. Check the documentation files
2. Look at the implementation examples
3. Review the test component
4. Check console logs for context
5. Contact the team

Good luck! 🚀
