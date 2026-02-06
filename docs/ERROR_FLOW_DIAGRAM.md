# Error Recovery Flow Diagrams

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                         │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              React Component                             │  │
│  │  - useApi() or useErrorHandler() hook                   │  │
│  │  - Manages error state                                  │  │
│  │  - Triggers retry logic                                 │  │
│  └────────────────┬─────────────────────────────────────────┘  │
│                   │                                              │
│                   │ fetch() with                                 │
│                   │ error handling                               │
│                   │                                              │
│  ┌────────────────▼─────────────────────────────────────────┐  │
│  │            Error Display Components                       │  │
│  │  - ErrorMessage (full)                                   │  │
│  │  - InlineErrorMessage (compact)                          │  │
│  │  - ErrorToast (notification)                             │  │
│  │                                                           │  │
│  │  Features:                                               │  │
│  │  - Shows user-friendly message                           │  │
│  │  - Retry button if retryable                             │  │
│  │  - Contact support link                                  │  │
│  └───────────────────────────────────────────────────────────┘  │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                      HTTP API Call
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                    SERVER (Next.js API Route)                    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              API Route Handler                             │ │
│  │  1. Verify authentication (createAuthErrorResponse)       │ │
│  │  2. Validate input (validateReportInput)                  │ │
│  │  3. Process request                                        │ │
│  │  4. Handle business logic errors (createError)            │ │
│  │  5. Catch unexpected errors (toAppError)                  │ │
│  └────────────┬─────────────────────────────────┬────────────┘ │
│               │                                 │                │
│               │ Success                        │ Error           │
│               │                                │                │
│      ┌────────▼──────────┐         ┌──────────▼─────────────┐   │
│      │ NextResponse.json │         │ AppError Interface     │   │
│      │ { data: ... }     │         │ ┌──────────────────┐   │   │
│      │                   │         │ │ code: ErrorCode  │   │   │
│      │ Status: 200       │         │ │ message: string  │   │   │
│      └─────────┬──────────┘         │ │ userMessage: st  │   │   │
│                │                   │ │ retryable: bool  │   │   │
│                │                   │ │ statusCode: num  │   │   │
│                │                   │ │ details?: object │   │   │
│                │                   │ └──────────────────┘   │   │
│                │                   │         │              │   │
│                │                   │ createErrorResponse()  │   │
│                │                   │         │              │   │
│                │                   │ ┌───────▼────────┐     │   │
│                │                   │ │ logError()     │     │   │
│                │                   │ │ (console)      │     │   │
│                │                   │ └────────────────┘     │   │
│                │                   │         │              │   │
│                │                   │ NextResponse.json      │   │
│                │                   │ { error: userMsg,      │   │
│                │                   │   code: string,        │   │
│                │                   │   retryable: bool }    │   │
│                │                   │ Status: statusCode     │   │
│                │                   └───────────────────────┘    │
│                │                                │                │
│                └─────────────────────┬──────────┘                │
│                                      │                          │
└──────────────────────────────────────┼──────────────────────────┘
                                       │
                            HTTP Response
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                          │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │         useApi/useErrorHandler Hook                        │ │
│  │                                                            │ │
│  │  1. Parse response                                        │ │
│  │  2. If !response.ok:                                      │ │
│  │     - extractError() -> ApiError                          │ │
│  │     - setError(apiError)                                  │ │
│  │  3. If retryable && user clicks retry:                    │ │
│  │     - Wait with exponential backoff                       │ │
│  │     - Retry with same request                             │ │
│  │     - Update retry count                                  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  State: { error, isLoading, retryCount, isRetrying }            │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## Detailed Error Handling Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                   API Route Execution                           │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │ Verify Authentication        │
        │ createClient().auth.getUser()│
        └────┬─────────────┬──────────┘
             │             │
          auth ▼            ▼ no auth
             OK      createAuthErrorResponse()
             │       (401, friendly message)
             │       │
             │       │ logError()
             │       │ [console logging]
             │       │
             │       ▼
             │    return NextResponse
             │    (stops here)
             │
             ▼
   ┌────────────────────────────┐
   │ Get Auth Context           │
   │ getAuthContext()           │
   └────┬──────────┬───────────┘
        │          │
        │ success  │ error
        │          │
        ▼          ▼ (403 Forbidden)
       OK      createForbiddenErrorResponse()
        │       │
        │       │ logError()
        │       │ [console logging]
        │       │
        │       ▼
        │    return NextResponse
        │    (stops here)
        │
        ▼
  ┌──────────────────────────────┐
  │ Parse Request Body           │
  │ request.json()               │
  └───┬──────────────┬──────────┘
      │              │
      │ success      │ error (invalid JSON)
      │              │
      ▼              ▼
     OK       PARSE_ERROR
      │       createError('PARSE_ERROR')
      │       createErrorResponse()
      │       │
      │       │ logError()
      │       │ [console logging]
      │       │
      │       ▼
      │    return NextResponse
      │    (stops here)
      │
      ▼
  ┌───────────────────────────────┐
  │ Validate Input                │
  │ validateReportInput(body)     │
  └───┬──────────┬────────────────┘
      │          │
      │ valid    │ invalid
      │          │
      ▼          ▼
     OK    VALIDATION_ERROR
      │    (400, friendly message)
      │    createErrorResponse()
      │    │
      │    │ logError()
      │    │ [console logging]
      │    │
      │    ▼
      │ return NextResponse
      │ (stops here)
      │
      ▼
  ┌──────────────────────────────┐
  │ Process Business Logic       │
  │ await generateReport(...)    │
  └───┬──────────┬───────────────┘
      │          │
      │ success  │ error
      │          │
      ▼          ▼
     OK    Check error type
      │    ├─ Salesforce?
      │    │  → handleSalesforceError()
      │    │  → SALESFORCE_ERROR (502)
      │    │
      │    ├─ Rate limited?
      │    │  → RATE_LIMITED (429)
      │    │
      │    └─ Unknown?
      │       → SERVER_ERROR (500)
      │
      │    createError('ERROR_CODE')
      │    createErrorResponse()
      │    │
      │    │ logError()
      │    │ [console logging with details]
      │    │
      │    ▼
      │ return NextResponse
      │ (stops here)
      │
      ▼
  ┌──────────────────┐
  │ Return Success   │
  │ NextResponse.    │
  │ json(data)       │
  │ Status: 200      │
  └──────────────────┘
```

## Retry Flow

```
┌───────────────────────────────────┐
│  User Action (e.g., Generate)     │
└────────────┬──────────────────────┘
             │
             ▼
   ┌──────────────────────────┐
   │ useApi.fetch() or        │
   │ useErrorHandler.execute()│
   └────┬────────────┬────────┘
        │            │
        │ starts     │ catch
        │            │
        ▼            ▼
   setState     toAppError()
   loading=true │
        │       createError()
        │       │
        │       ▼
        │    setError(apiError)
        │    isLoading=false
        │    return null
        │
        ▼ (continues)
   API Call
        │
        ├─ Network Error
        │  └─ extractError(response)
        │     → ApiError
        │     setError(apiError)
        │     return null
        │
        ├─ !response.ok
        │  └─ response.json()
        │     → { error, code, retryable }
        │     setError(apiError)
        │     return null
        │
        └─ response.ok
           └─ parse response
              return data
              setError(null)
              return data
                   │
                   └─ UI renders data
```

## Exponential Backoff Retry

```
┌────────────────────────────────────────────────────────────┐
│  Component Detects Error (retryable=true)                  │
│  User clicks "Try Again" or auto-retry triggered           │
└─────────────────┬──────────────────────────────────────────┘
                  │
                  ▼
   ┌──────────────────────────────────────────┐
   │ useErrorHandler.retry()                  │
   │ state: retryCount = 1                    │
   │ setState(isRetrying=true)                │
   └─────────────────┬────────────────────────┘
                     │
                     ▼
      ┌──────────────────────────────┐
      │ Calculate Delay              │
      │ delay = baseDelay * 2^(n-1)  │
      │                              │
      │ Example:                     │
      │ Attempt 1: 1000ms * 2^0 =    │
      │           1000ms (1s)        │
      │ Attempt 2: 1000ms * 2^1 =    │
      │           2000ms (2s)        │
      │ Attempt 3: 1000ms * 2^2 =    │
      │           4000ms (4s)        │
      └────┬─────────────────────────┘
           │
           ▼
      ┌────────────────────┐
      │ await setTimeout() │
      │ Wait calculated    │
      │ duration           │
      └────┬───────────────┘
           │
           ▼
      ┌─────────────────────────────┐
      │ Retry API Call              │
      │ operation()                 │
      │ (same as original request)  │
      └──┬──────────────┬──────────┘
         │              │
         │ success      │ failure
         │              │
         ▼              ▼
      ✓ Success    Check maxRetries
      (stop)       if retryCount < maxRetries:
         │           ├─ Increment retryCount
         │           ├─ Calculate new delay
         │           ├─ Wait
         │           └─ Retry again
         │
         │         else:
         │           └─ Give up
         │             setError()
         │             isRetrying=false
         │
         └─ Update UI with data
            isLoading=false
            isRetrying=false
```

## Error Code to HTTP Status Mapping

```
┌─────────────────────────────────────────────────────────────┐
│                 Error Classifications                       │
├──────────────────────┬──────────┬───────────┬──────────────┤
│ Category             │ Codes    │ HTTP      │ Retryable    │
├──────────────────────┼──────────┼───────────┼──────────────┤
│ Client Error (4xx)   │ VALIDATE │ 400       │ No           │
│ Request Invalid      │ AUTH     │ 401       │ No           │
│                      │ FORBIDDEN│ 403       │ No           │
│                      │ NOT_FOUND│ 404       │ No           │
│                      │ RATE     │ 429       │ YES          │
├──────────────────────┼──────────┼───────────┼──────────────┤
│ Server Error (5xx)   │ SERVER   │ 500       │ YES          │
│ Server Issue         │ SALESF   │ 502       │ YES          │
│                      │ SYNC     │ 503       │ YES          │
│                      │ NETWORK  │ 503       │ YES          │
│                      │ PARSE    │ 500       │ YES          │
└──────────────────────┴──────────┴───────────┴──────────────┘

4xx = Client's fault (user's action needed)
     └─ Do NOT auto-retry
     └─ Show user-friendly message

5xx = Server's fault (might be transient)
     └─ Automatic retry with backoff
     └─ Show user message with retry button
     └─ Notify user when giving up
```

## User Experience Flow

```
User Action
│
├─ Click "Generate Report"
│  ├─ Button shows "Loading..."
│  │
│  ├─ API call made
│  │
│  ├─ Response received
│  │
│  └─ Check response
│     │
│     ├─ Success (200)
│     │  └─ Show report data
│     │
│     └─ Error (!200)
│        ├─ Parse error
│        │
│        ├─ Show ErrorMessage component
│        │  ├─ Error icon
│        │  ├─ User-friendly message
│        │  │  (NOT technical error)
│        │  │
│        │  ├─ If retryable:
│        │  │  └─ "Try Again" button
│        │  │     └─ Click → retry() hook
│        │  │        └─ Wait 1s, 2s, 4s...
│        │  │           └─ Retry API call
│        │  │              └─ Show loading...
│        │  │                 └─ Success or error
│        │  │
│        │  └─ "Contact Support" link
│        │
│        └─ In console (for developers):
│           ├─ Full error object
│           ├─ Error code
│           ├─ Original message
│           └─ Stack trace (first 5 lines)
```

## Frontend Component Lifecycle

```
┌──────────────────────────────────────────────────┐
│ MyComponent with useApi hook                    │
└───────────────────┬──────────────────────────────┘
                    │
                    ▼
        ┌──────────────────────┐
        │ Initial State        │
        │ - data: null         │
        │ - error: null        │
        │ - isLoading: false   │
        │ - retryCount: 0      │
        └────┬─────────────────┘
             │
             │ render()
             │ ├─ No error → show button
             │ ├─ Data exists → show results
             │ └─ Loading → show spinner
             │
             ▼
  ┌─────────────────────────────────────┐
  │ User interacts with button          │
  │ onClick → fetch('POST', config)     │
  └────────┬──────────────────────────────┘
           │
           ▼
  ┌──────────────────────────┐
  │ isLoading → true         │
  │ setState({               │
  │   isLoading: true        │
  │ })                       │
  │                          │
  │ render() shows "Loading" │
  └────┬────────────────────┘
       │
       ▼
  ┌────────────────────────────────────┐
  │ fetch('/api/endpoint', {            │
  │   method: 'POST',                   │
  │   body: JSON.stringify(config)      │
  │ })                                  │
  └────┬───────────────┬──────────────┘
       │               │
       │ response ok   │ !response.ok
       │               │
       ▼               ▼
  ┌────────────┐  ┌──────────────────┐
  │ json()     │  │ extractError()   │
  │ setData()  │  │ → ApiError       │
  │ error=null │  │ setError()       │
  └─┬──────────┘  │ render() shows   │
    │             │ ErrorMessage     │
    │             │ component        │
    │             └────┬─────────────┘
    │                  │
    ▼                  ▼ if retryable
  render()         User sees retry
  ├─ Data shown      button
  ├─ No error        │
  ├─ Loading=false   │ User clicks
  └─ Button ready    │ "Try Again"
                     │
                     ▼
                 retry()
                 isRetrying=true
                 wait(1000ms)
                 │
                 └─ Retry API call
                    └─ repeat cycle

                 OR

                 Auto-retry after delay
                 (if configured)
```

These diagrams show how the error recovery system works from end to end, including the decision points, retry logic, and user experience.
