import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        // Use implicit flow to avoid PKCE verifier storage issues
        // The access token will be in the URL hash instead of exchanging a code
        flowType: 'implicit',
        // Detect session from URL on page load
        detectSessionInUrl: true,
        // Persist session
        persistSession: true,
      }
    }
  )
}
