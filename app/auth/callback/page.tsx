"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function AuthCallbackContent() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check for errors in URL params
        const error = searchParams.get("error");
        const errorDescription = searchParams.get("error_description");

        if (error) {
          console.error('[Auth Callback] Error:', error, errorDescription);
          setStatus("error");
          setErrorMessage(errorDescription || error);
          return;
        }

        // With implicit flow, the access token is in the URL hash
        // Supabase client automatically detects and handles this
        // Give it a moment to process
        await new Promise(resolve => setTimeout(resolve, 500));

        // Check if we have a session now
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('[Auth Callback] Session error:', sessionError);
          setStatus("error");
          setErrorMessage(sessionError.message);
          return;
        }

        if (session) {
          console.log('[Auth Callback] Session found, redirecting to dashboard');
          setStatus("success");
          setTimeout(() => router.push("/dashboard"), 1000);
          return;
        }

        // No session yet - maybe there's a code to exchange (PKCE flow fallback)
        const code = searchParams.get("code");
        if (code) {
          console.log('[Auth Callback] Exchanging code for session...');
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            console.error('[Auth Callback] Exchange error:', exchangeError);
            setStatus("error");
            setErrorMessage(exchangeError.message);
            return;
          }

          // Check session again after exchange
          const { data: { session: newSession } } = await supabase.auth.getSession();
          if (newSession) {
            setStatus("success");
            setTimeout(() => router.push("/dashboard"), 1000);
            return;
          }
        }

        // If we got here with no session, something went wrong
        setStatus("error");
        setErrorMessage("Unable to authenticate. Please try logging in again.");

      } catch (err: any) {
        console.error('[Auth Callback] Unexpected error:', err);
        setStatus("error");
        setErrorMessage(err.message || "Authentication failed");
      }
    };

    handleCallback();
  }, [router, supabase.auth, searchParams]);

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
            onClick={() => router.push("/")}
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
