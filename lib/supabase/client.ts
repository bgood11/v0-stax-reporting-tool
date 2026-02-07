import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // @supabase/ssr v0.5+ automatically handles cookies
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}
