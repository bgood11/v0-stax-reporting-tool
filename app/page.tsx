"use client";

import React from "react"

import { useState } from "react";
import { Mail, CheckCircle } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsLoading(false);
    setIsSubmitted(true);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 font-sans">
      <main className="w-full max-w-md">
        <div className="rounded-2xl bg-card p-8 shadow-xl">
          {!isSubmitted ? (
            <>
              <div className="mb-8 text-center">
                <h1 className="mb-2 text-3xl font-bold tracking-tight text-primary">
                  STAX
                </h1>
                <h2 className="text-xl font-semibold text-card-foreground">
                  Welcome to Stax Reporting
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Enter your email to receive a magic link
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-14 w-full rounded-xl border border-input bg-background pl-12 pr-4 text-card-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="h-14 w-full rounded-xl bg-gradient-to-r from-primary to-accent font-semibold text-primary-foreground transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isLoading ? "Sending..." : "Send Magic Link"}
                </button>
              </form>
            </>
          ) : (
            <div className="py-4 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle className="h-8 w-8 text-primary" />
              </div>
              <h2 className="mb-2 text-xl font-semibold text-card-foreground">
                Check your inbox
              </h2>
              <p className="text-sm text-muted-foreground">
                We sent a magic link to{" "}
                <span className="font-medium text-card-foreground">{email}</span>
              </p>
              <button
                onClick={() => {
                  setIsSubmitted(false);
                  setEmail("");
                }}
                className="mt-6 text-sm font-medium text-primary hover:underline"
              >
                Use a different email
              </button>
            </div>
          )}

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Only authorised Shermin staff can access this tool
          </p>
        </div>
      </main>
    </div>
  );
}
