'use client';

import React from 'react';
import { AlertCircle, X } from 'lucide-react';
import { Button } from './button';

export interface ErrorMessageProps {
  error: string;
  code?: string;
  retryable?: boolean;
  onRetry?: () => void;
  onDismiss?: () => void;
  showSupport?: boolean;
  supportLink?: string;
}

/**
 * Error Message Component
 *
 * Displays user-friendly error messages with:
 * - Clear error icon and messaging
 * - Retry button if error is retryable
 * - Contact support link for non-retryable errors
 * - Dismissible with close button
 */
export function ErrorMessage({
  error,
  code,
  retryable = false,
  onRetry,
  onDismiss,
  showSupport = true,
  supportLink = 'mailto:support@stax.com'
}: ErrorMessageProps) {
  return (
    <div className="flex gap-4 rounded-lg border border-red-200 bg-red-50 p-4">
      {/* Error Icon */}
      <div className="flex-shrink-0">
        <AlertCircle className="h-5 w-5 text-red-600" aria-hidden="true" />
      </div>

      {/* Error Content */}
      <div className="flex-grow">
        <h3 className="font-medium text-red-800">Error</h3>
        <p className="mt-1 text-sm text-red-700">{error}</p>

        {/* Error Code for debugging */}
        {code && (
          <p className="mt-2 text-xs text-red-600">
            Error Code: <code className="font-mono">{code}</code>
          </p>
        )}

        {/* Action Buttons */}
        <div className="mt-4 flex gap-3">
          {retryable && onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="text-red-600 hover:text-red-700"
            >
              Try Again
            </Button>
          )}

          {showSupport && (
            <a
              href={supportLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Contact Support
            </a>
          )}
        </div>
      </div>

      {/* Dismiss Button */}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="flex-shrink-0 text-red-400 hover:text-red-600"
          aria-label="Dismiss error"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}

/**
 * Inline Error Message - Compact version for use in forms/modals
 */
export function InlineErrorMessage({
  error,
  onDismiss
}: {
  error: string;
  onDismiss?: () => void;
}) {
  return (
    <div className="flex gap-2 rounded bg-red-50 p-3 text-sm">
      <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-600" />
      <p className="text-red-700">{error}</p>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="ml-auto flex-shrink-0 text-red-400 hover:text-red-600"
          aria-label="Dismiss error"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/**
 * Toast-style Error Notification
 */
export function ErrorToast({
  error,
  code,
  retryable = false,
  onRetry,
  onDismiss,
  autoClose = true,
  autoCloseDuration = 5000
}: ErrorMessageProps & {
  autoClose?: boolean;
  autoCloseDuration?: number;
}) {
  const [isVisible, setIsVisible] = React.useState(true);

  React.useEffect(() => {
    if (!autoClose || !isVisible) return;

    const timer = setTimeout(() => {
      setIsVisible(false);
      onDismiss?.();
    }, autoCloseDuration);

    return () => clearTimeout(timer);
  }, [autoClose, autoCloseDuration, isVisible, onDismiss]);

  if (!isVisible) return null;

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  return (
    <div className="fixed bottom-4 right-4 max-w-sm rounded-lg border border-red-200 bg-red-50 p-4 shadow-lg">
      <div className="flex gap-3">
        <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
        <div className="flex-grow">
          <p className="text-sm font-medium text-red-800">{error}</p>
          {code && (
            <p className="mt-1 text-xs text-red-600">
              Code: <code className="font-mono">{code}</code>
            </p>
          )}
          {retryable && onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 text-xs font-medium text-red-600 hover:text-red-700 underline"
            >
              Try Again
            </button>
          )}
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-red-400 hover:text-red-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
