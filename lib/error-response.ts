/**
 * Error Response Helper
 *
 * Standardizes API error responses with proper formatting and HTTP status codes
 */

import { NextResponse } from 'next/server';
import type { AppError } from './error-handler';
import { logError } from './error-handler';

export interface ErrorResponseBody {
  error: string;
  code: string;
  retryable: boolean;
}

/**
 * Create a standardized error response
 * Never exposes technical details to the client
 */
export function createErrorResponse(
  error: AppError,
  context?: string
): NextResponse<ErrorResponseBody> {
  // Log the full error details for debugging
  logError(error, context);

  // Return user-friendly response (never includes technical details)
  const body: ErrorResponseBody = {
    error: error.userMessage,
    code: error.code,
    retryable: error.retryable
  };

  return NextResponse.json(body, { status: error.statusCode });
}

/**
 * Create an error response from a raw error
 * Converts to AppError first, then creates response
 */
export function createErrorResponseFromRaw(
  error: unknown,
  context?: string
): NextResponse<ErrorResponseBody> {
  // Import locally to avoid circular dependency
  const { toAppError } = require('./error-handler');
  const appError = toAppError(error, context);
  return createErrorResponse(appError, context);
}

/**
 * Create a validation error response
 */
export function createValidationErrorResponse(
  message: string,
  context?: string
): NextResponse<ErrorResponseBody> {
  const { createError } = require('./error-handler');
  const error = createError('VALIDATION_ERROR', message, {
    userMessage: message
  });
  return createErrorResponse(error, context);
}

/**
 * Create an auth error response
 */
export function createAuthErrorResponse(
  context?: string
): NextResponse<ErrorResponseBody> {
  const { createError } = require('./error-handler');
  const error = createError('AUTH_ERROR', 'User not authenticated');
  return createErrorResponse(error, context);
}

/**
 * Create a forbidden error response
 */
export function createForbiddenErrorResponse(
  context?: string
): NextResponse<ErrorResponseBody> {
  const { createError } = require('./error-handler');
  const error = createError('FORBIDDEN', 'User does not have permission');
  return createErrorResponse(error, context);
}

/**
 * Create a not found error response
 */
export function createNotFoundErrorResponse(
  resource: string,
  context?: string
): NextResponse<ErrorResponseBody> {
  const { createError } = require('./error-handler');
  const error = createError('NOT_FOUND', `Resource not found: ${resource}`, {
    userMessage: `The ${resource} you requested was not found.`
  });
  return createErrorResponse(error, context);
}

/**
 * Create a server error response
 */
export function createServerErrorResponse(
  error: unknown,
  context?: string
): NextResponse<ErrorResponseBody> {
  const { toAppError } = require('./error-handler');
  const appError = toAppError(error, context);
  return createErrorResponse(appError, context);
}
