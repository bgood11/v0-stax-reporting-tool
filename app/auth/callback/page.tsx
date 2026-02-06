"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the code from URL
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        const error = params.get("error");
        const errorDescription = params.get("error_description");

        console.log("Auth callback params:", { code: !!code, error, errorDescription });

        if (error) {
          setStatus("error");
          setErrorMessage(errorDescription || error);
          return;
        }

        if (code) {
          // Exchange the code for a session using the Supabase client
          // The client has access to the PKCE verifier stored in localStorage
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            console.error("Code exchange error:", exchangeError);
            setStatus("error");
            setErrorMessage(exchangeError.message);
            return;
          }

          setStatus("success");
          // Redirect to dashboard after successful auth
          setTimeout(() => {
            router.push("/dashboard");
          }, 1000);
        } else {
          // No code - check if there's a hash fragment (implicit flow)
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get("access_token");

          if (accessToken) {
            // Session should be automatically set by Supabase client
            const { data: { session } } = await supabase.auth.getSession();

            if (session) {
              setStatus("success");
              setTimeout(() => {
                router.push("/dashboard");
              }, 1000);
              return;
            }
          }

          setStatus("error");
          setErrorMessage("No authentication code received");
        }
      } catch (err: any) {
        console.error("Auth callback error:", err);
        setStatus("error");
        setErrorMessage(err.message || "Authentication failed");
      }
    };

    handleCallback();
  }, [router, supabase.auth]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
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
    </div>
  );
}
