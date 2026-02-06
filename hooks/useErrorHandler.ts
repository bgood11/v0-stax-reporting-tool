/**
 * useErrorHandler Hook
 *
 * Provides error handling utilities for API calls with:
 * - Automatic error message extraction
 * - Retry logic with exponential backoff
 * - Error state management
 */

import { useState, useCallback } from 'react';

export interface ApiError {
  error: string;
  code: string;
  retryable: boolean;
  status?: number;
}

export interface UseErrorHandlerState {
  error: ApiError | null;
  isLoading: boolean;
  isRetrying: boolean;
  retryCount: number;
}

export interface UseErrorHandlerOptions {
  maxRetries?: number;
  baseDelay?: number; // milliseconds
  onError?: (error: ApiError) => void;
  onRetry?: (attempt: number) => void;
}

/**
 * Hook for managing API errors and retries
 */
export function useErrorHandler(options: UseErrorHandlerOptions = {}) {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    onError,
    onRetry
  } = options;

  const [state, setState] = useState<UseErrorHandlerState>({
    error: null,
    isLoading: false,
    isRetrying: false,
    retryCount: 0
  });

  /**
   * Extract error from API response
   */
  const extractError = useCallback(async (response: Response): Promise<ApiError> => {
    try {
      const data = await response.json();
      return {
        error: data.error || 'An error occurred',
        code: data.code || 'UNKNOWN_ERROR',
        retryable: data.retryable ?? response.status >= 500,
        status: response.status
      };
    } catch {
      // Fallback if response is not JSON
      return {
        error: 'Unable to process the response. Please try again.',
        code: 'PARSE_ERROR',
        retryable: true,
        status: response.status
      };
    }
  }, []);

  /**
   * Set error state and call callback
   */
  const setError = useCallback((error: ApiError | null) => {
    setState(prev => ({
      ...prev,
      error
    }));
    if (error) {
      onError?.(error);
    }
  }, [onError]);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null
    }));
  }, []);

  /**
   * Calculate delay for exponential backoff
   */
  const getDelay = useCallback((attempt: number): number => {
    return baseDelay * Math.pow(2, attempt - 1);
  }, [baseDelay]);

  /**
   * Retry a failed operation with exponential backoff
   */
  const retry = useCallback(async (
    operation: () => Promise<Response>
  ): Promise<Response | null> => {
    const { retryCount } = state;

    if (!state.error?.retryable || retryCount >= maxRetries) {
      return null;
    }

    const newRetryCount = retryCount + 1;
    setState(prev => ({
      ...prev,
      isRetrying: true,
      retryCount: newRetryCount
    }));

    onRetry?.(newRetryCount);

    // Wait before retrying
    const delay = getDelay(newRetryCount);
    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      const response = await operation();
      setState(prev => ({
        ...prev,
        isRetrying: false
      }));
      return response;
    } catch (error) {
      const apiError = await extractError(
        new Response(JSON.stringify({
          error: error instanceof Error ? error.message : 'Network error',
          code: 'NETWORK_ERROR',
          retryable: true
        }), { status: 503 })
      );
      setError(apiError);
      return null;
    }
  }, [state, maxRetries, onRetry, getDelay, extractError, setError]);

  /**
   * Execute an API call with error handling
   */
  const execute = useCallback(async <T,>(
    operation: () => Promise<Response>,
    parser?: (response: Response) => Promise<T>
  ): Promise<T | null> => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      retryCount: 0
    }));

    try {
      const response = await operation();

      if (!response.ok) {
        const error = await extractError(response);
        setError(error);
        return null;
      }

      const data = parser ? await parser(response) : await response.json();
      setState(prev => ({
        ...prev,
        isLoading: false
      }));
      return data;
    } catch (error) {
      const apiError = await extractError(
        new Response(JSON.stringify({
          error: error instanceof Error ? error.message : 'Network error',
          code: 'NETWORK_ERROR',
          retryable: true
        }), { status: 503 })
      );
      setError(apiError);
      return null;
    } finally {
      setState(prev => ({
        ...prev,
        isLoading: false
      }));
    }
  }, [extractError, setError]);

  return {
    ...state,
    setError,
    clearError,
    execute,
    retry,
    extractError
  };
}

/**
 * Hook for making API calls with automatic error handling
 */
export function useApi<T = any>(url: string, options: UseErrorHandlerOptions = {}) {
  const errorHandler = useErrorHandler(options);
  const [data, setData] = useState<T | null>(null);

  const fetch = useCallback(async (method: 'GET' | 'POST' = 'GET', body?: any) => {
    return errorHandler.execute(
      () => window.fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined
      }),
      (response) => response.json().then(json => {
        setData(json);
        return json;
      })
    );
  }, [url, errorHandler]);

  const refetch = useCallback(async (method: 'GET' | 'POST' = 'GET', body?: any) => {
    const response = await errorHandler.retry(
      () => window.fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined
      })
    );

    if (response && response.ok) {
      const json = await response.json();
      setData(json);
      return json;
    }

    return null;
  }, [url, errorHandler]);

  return {
    data,
    ...errorHandler,
    fetch,
    refetch
  };
}
