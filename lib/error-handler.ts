/**
 * Error Handler Utility for Stax Reporting Tool
 *
 * Standardizes error handling across the application with:
 * - User-friendly error messages
 * - Proper HTTP status codes
 * - Retry information
 * - Detailed console logging for debugging
 */

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'AUTH_ERROR'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR'
  | 'SALESFORCE_ERROR'
  | 'SYNC_FAILED'
  | 'NETWORK_ERROR'
  | 'PARSE_ERROR'
  | 'UNKNOWN_ERROR';

export interface AppError {
  code: ErrorCode;
  message: string; // Technical message for logging
  userMessage: string; // User-friendly message
  retryable: boolean;
  statusCode: number;
  details?: Record<string, any>; // Additional error context
}

/**
 * Create a standardized AppError
 */
export function createError(
  code: ErrorCode,
  message: string,
  options?: {
    userMessage?: string;
    retryable?: boolean;
    statusCode?: number;
    details?: Record<string, any>;
  }
): AppError {
  const defaults = getErrorDefaults(code);

  return {
    code,
    message,
    userMessage: options?.userMessage || defaults.userMessage,
    retryable: options?.retryable !== undefined ? options.retryable : defaults.retryable,
    statusCode: options?.statusCode || defaults.statusCode,
    details: options?.details
  };
}

/**
 * Get default error configuration by error code
 */
function getErrorDefaults(code: ErrorCode): {
  userMessage: string;
  retryable: boolean;
  statusCode: number;
} {
  const defaults: Record<ErrorCode, { userMessage: string; retryable: boolean; statusCode: number }> = {
    VALIDATION_ERROR: {
      userMessage: 'Please check your input and try again.',
      retryable: false,
      statusCode: 400
    },
    AUTH_ERROR: {
      userMessage: 'Your session has expired. Please sign in again.',
      retryable: false,
      statusCode: 401
    },
    FORBIDDEN: {
      userMessage: 'You do not have permission to access this resource.',
      retryable: false,
      statusCode: 403
    },
    NOT_FOUND: {
      userMessage: 'The requested resource was not found.',
      retryable: false,
      statusCode: 404
    },
    RATE_LIMITED: {
      userMessage: 'Too many requests. Please wait a moment and try again.',
      retryable: true,
      statusCode: 429
    },
    SERVER_ERROR: {
      userMessage: 'Something went wrong on our end. Our team has been notified.',
      retryable: true,
      statusCode: 500
    },
    SALESFORCE_ERROR: {
      userMessage: 'Unable to connect to Salesforce. Please check your credentials.',
      retryable: true,
      statusCode: 502
    },
    SYNC_FAILED: {
      userMessage: 'Unable to sync data from Salesforce. Click retry to try again.',
      retryable: true,
      statusCode: 503
    },
    NETWORK_ERROR: {
      userMessage: 'Network connection failed. Please check your connection and try again.',
      retryable: true,
      statusCode: 503
    },
    PARSE_ERROR: {
      userMessage: 'Unable to process the response. Please try again.',
      retryable: true,
      statusCode: 500
    },
    UNKNOWN_ERROR: {
      userMessage: 'An unexpected error occurred. Please try again.',
      retryable: true,
      statusCode: 500
    }
  };

  return defaults[code];
}

/**
 * Log an error with appropriate detail level
 */
export function logError(error: AppError, context?: string): void {
  const logPrefix = context ? `[${context}]` : '[Error]';
  const errorInfo = {
    code: error.code,
    message: error.message,
    statusCode: error.statusCode,
    retryable: error.retryable,
    ...(error.details && { details: error.details })
  };

  console.error(`${logPrefix}`, errorInfo);

  // Log additional context for debugging
  if (error.details) {
    console.error(`${logPrefix} Details:`, error.details);
  }
}

/**
 * Check if error is from a known API error
 */
export function isAppError(error: unknown): error is AppError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    'userMessage' in error &&
    'statusCode' in error
  );
}

/**
 * Convert any error to AppError
 */
export function toAppError(error: unknown, context?: string): AppError {
  // Already an AppError
  if (isAppError(error)) {
    return error;
  }

  // Error object with message
  if (error instanceof Error) {
    const message = error.message || 'Unknown error occurred';
    logError(
      createError('UNKNOWN_ERROR', message, {
        details: {
          errorName: error.name,
          stack: error.stack?.split('\n').slice(0, 5).join('\n') // First 5 stack lines
        }
      }),
      context
    );
    return createError('UNKNOWN_ERROR', message);
  }

  // String error
  if (typeof error === 'string') {
    logError(createError('UNKNOWN_ERROR', error), context);
    return createError('UNKNOWN_ERROR', error);
  }

  // Unknown type
  const unknownError = 'An unknown error occurred';
  logError(
    createError('UNKNOWN_ERROR', unknownError, {
      details: { errorType: typeof error, errorValue: String(error) }
    }),
    context
  );
  return createError('UNKNOWN_ERROR', unknownError);
}

/**
 * Validate report generation input
 */
export function validateReportInput(body: any): AppError | null {
  if (!body) {
    return createError(
      'VALIDATION_ERROR',
      'Request body is missing',
      { userMessage: 'Invalid request. Please refresh and try again.' }
    );
  }

  // Check for required fields based on report type
  const reportType = body.reportType || 'AD';
  if (!['AD', 'AP'].includes(reportType)) {
    return createError(
      'VALIDATION_ERROR',
      `Invalid report type: ${reportType}`,
      { userMessage: 'Please select a valid report type.' }
    );
  }

  // Validate filters exist but can be empty
  if (!body.filters || typeof body.filters !== 'object') {
    return createError(
      'VALIDATION_ERROR',
      'Filters object is required',
      { userMessage: 'Please select at least one filter to generate a report.' }
    );
  }

  return null;
}

/**
 * Handle Salesforce-specific errors
 */
export function handleSalesforceError(error: any): AppError {
  const message = error?.message || 'Salesforce API error';
  const errorCode = error?.errorCode || error?.code;

  // INVALID_AUTH - authentication failure
  if (errorCode === 'INVALID_AUTH' || message.includes('invalid_client')) {
    return createError(
      'AUTH_ERROR',
      `Salesforce auth failed: ${message}`,
      {
        userMessage: 'Salesforce credentials are invalid. Please contact an administrator.'
      }
    );
  }

  // Rate limiting
  if (errorCode === 'REQUEST_LIMIT_EXCEEDED' || error?.statusCode === 429) {
    return createError(
      'RATE_LIMITED',
      `Salesforce rate limit: ${message}`,
      {
        userMessage: 'Salesforce rate limit exceeded. Please wait and try again.'
      }
    );
  }

  // Connection errors
  if (
    message.includes('ECONNREFUSED') ||
    message.includes('ETIMEDOUT') ||
    message.includes('ENOTFOUND')
  ) {
    return createError(
      'SALESFORCE_ERROR',
      `Network error connecting to Salesforce: ${message}`,
      {
        userMessage: 'Unable to connect to Salesforce. Please check the connection and try again.'
      }
    );
  }

  // Generic Salesforce error
  return createError(
    'SALESFORCE_ERROR',
    `Salesforce API error: ${message}`,
    {
      details: { errorCode, originalMessage: message }
    }
  );
}

/**
 * Safe JSON parse with error handling
 */
export function safeJsonParse(json: string, context?: string): any {
  try {
    return JSON.parse(json);
  } catch (error) {
    const parseError = createError(
      'PARSE_ERROR',
      `Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown parse error'}`,
      {
        userMessage: 'Unable to process the response. Please try again.',
        details: { rawJson: json.substring(0, 100) } // First 100 chars
      }
    );
    logError(parseError, context);
    throw parseError;
  }
}
