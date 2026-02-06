# Error Handler Implementation Examples

This document provides copy-paste examples for implementing the error handler in other API routes.

## Quick Reference

### Import Pattern

```typescript
import { createError, logError } from '@/lib/error-handler';
import { createErrorResponse, createAuthErrorResponse } from '@/lib/error-response';

const CONTEXT = 'route/name'; // Used for logging context
```

### Basic Route Template

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createError } from '@/lib/error-handler';
import { createErrorResponse, createAuthErrorResponse } from '@/lib/error-response';

const CONTEXT = 'my-route';

export async function POST(request: NextRequest) {
  // 1. Verify auth
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return createAuthErrorResponse(CONTEXT);
  }

  try {
    // 2. Parse and validate input
    const body = await request.json();

    if (!body.requiredField) {
      const error = createError(
        'VALIDATION_ERROR',
        'Missing required field',
        { userMessage: 'Please provide a required field.' }
      );
      return createErrorResponse(error, CONTEXT);
    }

    // 3. Process request
    const result = await doSomething(body);

    // 4. Handle errors in business logic
    if (!result.success) {
      const error = createError(
        'SERVER_ERROR',
        result.error || 'Operation failed',
        { userMessage: 'Unable to complete operation. Please try again.' }
      );
      return createErrorResponse(error, CONTEXT);
    }

    // 5. Return success
    return NextResponse.json(result.data);

  } catch (error: any) {
    // 6. Handle unexpected errors
    const appError = createError(
      'SERVER_ERROR',
      error.message || 'Unexpected error',
      {
        details: {
          errorName: error.name,
          stack: error.stack?.split('\n').slice(0, 3).join('\n')
        }
      }
    );
    return createErrorResponse(appError, CONTEXT);
  }
}
```

## Common Patterns

### Pattern 1: Simple GET Endpoint

```typescript
export async function GET() {
  try {
    const data = await fetchData();
    return NextResponse.json(data);
  } catch (error: any) {
    const appError = createError(
      'SERVER_ERROR',
      error.message || 'Failed to fetch data',
      { userMessage: 'Unable to load data. Please refresh and try again.' }
    );
    return createErrorResponse(appError, CONTEXT);
  }
}
```

### Pattern 2: Validation + Processing

```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate email format
    if (!body.email?.includes('@')) {
      const error = createError(
        'VALIDATION_ERROR',
        'Invalid email format',
        { userMessage: 'Please enter a valid email address.' }
      );
      return createErrorResponse(error, CONTEXT);
    }

    const result = await processEmail(body.email);
    return NextResponse.json(result);

  } catch (error: any) {
    return createServerErrorResponse(error, CONTEXT);
  }
}
```

### Pattern 3: Permission Checking

```typescript
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return createAuthErrorResponse(CONTEXT);
  }

  try {
    // Check if user owns the resource
    const resource = await getResource(id);

    if (resource.userId !== user.id) {
      const error = createError('FORBIDDEN', 'User does not own this resource');
      return createErrorResponse(error, CONTEXT);
    }

    await deleteResource(id);
    return NextResponse.json({ success: true });

  } catch (error: any) {
    return createServerErrorResponse(error, CONTEXT);
  }
}
```

### Pattern 4: Salesforce Operations

```typescript
import { handleSalesforceError } from '@/lib/error-handler';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await salesforceService.query(body.query);
    return NextResponse.json(result);

  } catch (error: any) {
    // Check if it's a Salesforce error
    if (error.errorCode || error.message?.includes('Salesforce')) {
      const sfError = handleSalesforceError(error);
      return createErrorResponse(sfError, CONTEXT);
    }

    return createServerErrorResponse(error, CONTEXT);
  }
}
```

### Pattern 5: Async Operations with Retry Info

```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await longRunningOperation(body);

    if (result.failed) {
      const error = createError(
        'SYNC_FAILED',
        result.failureReason || 'Operation did not complete',
        {
          userMessage: 'The operation could not complete. Please retry.',
          retryable: true
        }
      );
      return createErrorResponse(error, CONTEXT);
    }

    return NextResponse.json(result);

  } catch (error: any) {
    return createServerErrorResponse(error, CONTEXT);
  }
}
```

### Pattern 6: Query Parameter Validation

```typescript
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page');
    const limit = searchParams.get('limit');

    // Validate page parameter
    if (page && isNaN(Number(page))) {
      const error = createError(
        'VALIDATION_ERROR',
        'Invalid page parameter',
        { userMessage: 'Page must be a number.' }
      );
      return createErrorResponse(error, CONTEXT);
    }

    // Validate limit parameter
    const pageLimit = Math.min(Number(limit) || 10, 100);
    const pageNum = Math.max(Number(page) || 1, 1);

    const data = await fetchPaginatedData(pageNum, pageLimit);
    return NextResponse.json(data);

  } catch (error: any) {
    return createServerErrorResponse(error, CONTEXT);
  }
}
```

### Pattern 7: Multiple Validation Steps

```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validation chain
    if (!body.name?.trim()) {
      return createValidationErrorResponse('Name is required', CONTEXT);
    }

    if (!body.description?.trim()) {
      return createValidationErrorResponse('Description is required', CONTEXT);
    }

    if (body.name.length > 255) {
      return createValidationErrorResponse(
        'Name must be less than 255 characters',
        CONTEXT
      );
    }

    const result = await createRecord(body);
    return NextResponse.json(result);

  } catch (error: any) {
    return createServerErrorResponse(error, CONTEXT);
  }
}
```

### Pattern 8: Handling Database Errors

```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await supabase
      .from('table')
      .insert(body)
      .select()
      .single();

    if (result.error) {
      // Check if it's a unique constraint violation
      if (result.error.message.includes('unique')) {
        const error = createError(
          'VALIDATION_ERROR',
          result.error.message,
          { userMessage: 'This record already exists.' }
        );
        return createErrorResponse(error, CONTEXT);
      }

      // Handle other database errors
      const error = createError(
        'SERVER_ERROR',
        result.error.message,
        { userMessage: 'Unable to save record. Please try again.' }
      );
      return createErrorResponse(error, CONTEXT);
    }

    return NextResponse.json(result.data);

  } catch (error: any) {
    return createServerErrorResponse(error, CONTEXT);
  }
}
```

## Frontend Integration Examples

### Example 1: Simple Component with Error Display

```typescript
'use client';

import { useState } from 'react';
import { useApi } from '@/hooks/useErrorHandler';
import { ErrorMessage } from '@/components/ui/error-message';
import { Button } from '@/components/ui/button';

export function MyComponent() {
  const { data, error, isLoading, fetch, refetch } = useApi('/api/my-endpoint');

  const handleAction = async () => {
    await fetch('POST', { /* data */ });
  };

  const handleRetry = async () => {
    await refetch('POST', { /* data */ });
  };

  return (
    <div>
      {error && (
        <ErrorMessage
          error={error.error}
          code={error.code}
          retryable={error.retryable}
          onRetry={handleRetry}
          onDismiss={() => {
            // Handle dismiss
          }}
        />
      )}

      {isLoading && <p>Loading...</p>}

      {data && <div>{/* Display data */}</div>}

      <Button onClick={handleAction} disabled={isLoading}>
        Take Action
      </Button>
    </div>
  );
}
```

### Example 2: Form with Field-Level Error Display

```typescript
'use client';

import { useErrorHandler } from '@/hooks/useErrorHandler';
import { InlineErrorMessage } from '@/components/ui/error-message';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

export function MyForm() {
  const [formData, setFormData] = useState({ name: '', email: '' });
  const { error, isLoading, execute, clearError } = useErrorHandler({
    onError: (err) => console.error('Form error:', err)
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    const result = await execute(
      () => fetch('/api/submit-form', {
        method: 'POST',
        body: JSON.stringify(formData)
      }),
      (res) => res.json()
    );

    if (result) {
      // Handle success
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <InlineErrorMessage
          error={error.error}
          onDismiss={clearError}
        />
      )}

      <div>
        <label>Name</label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>

      <div>
        <label>Email</label>
        <Input
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
      </div>

      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Submitting...' : 'Submit'}
      </Button>
    </form>
  );
}
```

### Example 3: Component with Auto-Retry

```typescript
'use client';

import { useErrorHandler } from '@/hooks/useErrorHandler';
import { ErrorToast } from '@/components/ui/error-message';
import { useEffect } from 'react';

export function DataFetcher() {
  const {
    error,
    isRetrying,
    retryCount,
    execute,
    retry
  } = useErrorHandler({
    maxRetries: 3,
    baseDelay: 1000,
    onRetry: (attempt) => console.log(`Retry attempt ${attempt}`)
  });

  useEffect(() => {
    const loadData = async () => {
      await execute(
        () => fetch('/api/data'),
        (res) => res.json()
      );
    };

    loadData();
  }, [execute]);

  const handleManualRetry = async () => {
    const response = await retry(() => fetch('/api/data'));
    if (response?.ok) {
      // Data loaded successfully
    }
  };

  return (
    <div>
      {error && (
        <ErrorToast
          error={error.error}
          code={error.code}
          retryable={error.retryable}
          onRetry={handleManualRetry}
          autoClose={false}
        />
      )}

      {isRetrying && (
        <p>Retrying... (Attempt {retryCount})</p>
      )}
    </div>
  );
}
```

## Testing Error Scenarios

### Test Validation Error

```bash
curl -X POST http://localhost:3000/api/reports/generate \
  -H "Content-Type: application/json" \
  -d '{}' \
  -H "Cookie: your-auth-cookie"

# Expected: 400 with validation error message
```

### Test Auth Error

```bash
curl -X POST http://localhost:3000/api/reports/generate \
  -H "Content-Type: application/json" \
  -d '{"reportType": "AD", "filters": {}}'

# Expected: 401 with auth error message (no auth cookie)
```

### Test Retry Logic in Frontend

```typescript
// Simulate error then retry
const { error, retry, execute } = useErrorHandler();

// Make failing request
await execute(
  () => fetch('/api/endpoint', { method: 'POST' }),
  () => { throw new Error('Simulated error'); }
);

// error.retryable should be true
// Call retry to attempt again with backoff

console.log(error.retryable); // true
```

## Migration Checklist

- [ ] Identify routes needing error handling
- [ ] Add error handler imports
- [ ] Define CONTEXT constant
- [ ] Wrap main logic in try-catch
- [ ] Add auth validation error handling
- [ ] Add input validation error handling
- [ ] Add business logic error handling
- [ ] Add unexpected error handling
- [ ] Update frontend to use useErrorHandler hook
- [ ] Add error message components to UI
- [ ] Test error scenarios
- [ ] Test retry logic
- [ ] Update API documentation
