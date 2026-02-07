"use client";

import { Suspense, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function AuthCallbackContent() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const supabase = createClient();

        // Check for errors in URL query params
        const url = new URL(window.location.href);
        const queryError = url.searchParams.get("error");
        const queryErrorDesc = url.searchParams.get("error_description") || url.searchParams.get("message");

        // Check hash fragment for tokens or errors (Supabase sends tokens in hash)
        const hash = window.location.hash.substring(1);
        const hashParams = new URLSearchParams(hash);
        const hashError = hashParams.get("error");
        const hashErrorDesc = hashParams.get("error_description");
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");

        console.log('[Auth Callback] Processing...', {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          queryError,
          hashError
        });

        // Handle errors
        const error = hashError || queryError;
        const errorDescription = hashErrorDesc || queryErrorDesc;
        if (error && !accessToken) {
          console.error('[Auth Callback] Error:', error, errorDescription);
          setStatus("error");
          setErrorMessage(errorDescription || error);
          return;
        }

        // If we have tokens in the hash, Supabase client should auto-detect them
        // But let's also try to set the session manually if needed
        if (accessToken && refreshToken) {
          console.log('[Auth Callback] Setting session from hash tokens...');
          const { error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (setSessionError) {
            console.error('[Auth Callback] Set session error:', setSessionError);
            setStatus("error");
            setErrorMessage(setSessionError.message);
            return;
          }

          console.log('[Auth Callback] Session set successfully!');
          setStatus("success");

          // Clear the hash from the URL for security
          window.history.replaceState(null, '', window.location.pathname);

          // Use hard redirect to ensure cookies are sent to server
          setTimeout(() => window.location.href = '/dashboard', 1000);
          return;
        }

        // No tokens in hash - check if we already have a session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('[Auth Callback] Session error:', sessionError);
          setStatus("error");
          setErrorMessage(sessionError.message);
          return;
        }

        if (session) {
          console.log('[Auth Callback] Existing session found');
          setStatus("success");
          // Use hard redirect to ensure cookies are sent to server
          setTimeout(() => window.location.href = '/dashboard', 1000);
          return;
        }

        // No tokens and no session
        setStatus("error");
        setErrorMessage("No authentication tokens received. Please try logging in again.");

      } catch (err: any) {
        console.error('[Auth Callback] Unexpected error:', err);
        setStatus("error");
        setErrorMessage(err.message || "Authentication failed");
      }
    };

    handleCallback();
  }, []);

  return (
    <div className="w-full max-w-md rounded-2xl bg-card p-8 shadow-xl text-center">
      {status === "loading" && (
        <>
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <h2 className="text-xl font-semibold text-card-foreground">
            Signing you in...
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Please wait while we verify your credentials
          </p>
        </>
      )}

      {status === "success" && (
        <>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-card-foreground">
            Authentication successful!
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Redirecting to dashboard...
          </p>
        </>
      )}

      {status === "error" && (
        <>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-card-foreground">
            Authentication failed
          </h2>
          <p className="mt-2 text-sm text-red-500">
            {errorMessage || "Please try again"}
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="mt-6 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Back to Login
          </button>
        </>
      )}
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="w-full max-w-md rounded-2xl bg-card p-8 shadow-xl text-center">
      <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      <h2 className="text-xl font-semibold text-card-foreground">
        Loading...
      </h2>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Suspense fallback={<LoadingFallback />}>
        <AuthCallbackContent />
      </Suspense>
    </div>
  );
}
