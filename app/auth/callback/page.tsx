"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function AuthCallbackContent() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check for errors in URL - could be in query params OR hash fragment
        const url = new URL(window.location.href);
        const queryError = url.searchParams.get("error");
        const queryErrorDesc = url.searchParams.get("error_description");

        // Also check hash fragment for errors (implicit flow)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const hashError = hashParams.get("error");
        const hashErrorDesc = hashParams.get("error_description");

        const error = queryError || hashError;
        const errorDescription = queryErrorDesc || hashErrorDesc;

        if (error) {
          console.error('[Auth Callback] Error:', error, errorDescription);
          setStatus("error");
          setErrorMessage(errorDescription || error);
          return;
        }

        // With implicit flow, Supabase client automatically detects the token in the hash
        // and sets up the session. We just need to wait for it.
        console.log('[Auth Callback] Waiting for Supabase to process auth...');

        // Give Supabase client time to detect and process the hash fragment
        await new Promise(resolve => setTimeout(resolve, 1000));

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

        // No session yet - try listening for auth state change
        console.log('[Auth Callback] No session yet, waiting for auth state change...');

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          console.log('[Auth Callback] Auth state changed:', event);
          if (event === 'SIGNED_IN' && session) {
            setStatus("success");
            setTimeout(() => router.push("/dashboard"), 1000);
            subscription.unsubscribe();
          }
        });

        // Give it a few more seconds
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Final check
        const { data: { session: finalSession } } = await supabase.auth.getSession();
        if (finalSession) {
          setStatus("success");
          subscription.unsubscribe();
          setTimeout(() => router.push("/dashboard"), 1000);
          return;
        }

        // If we still don't have a session, something went wrong
        subscription.unsubscribe();
        setStatus("error");
        setErrorMessage("Unable to authenticate. Please try logging in again.");

      } catch (err: any) {
        console.error('[Auth Callback] Unexpected error:', err);
        setStatus("error");
        setErrorMessage(err.message || "Authentication failed");
      }
    };

    handleCallback();
  }, [router, supabase.auth]);

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
