import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          // Parse cookies from document.cookie
          const cookies: { name: string; value: string }[] = []
          if (typeof document !== 'undefined') {
            document.cookie.split(';').forEach((cookie) => {
              const [name, ...rest] = cookie.trim().split('=')
              if (name) {
                cookies.push({ name, value: rest.join('=') })
              }
            })
          }
          return cookies
        },
        setAll(cookiesToSet) {
          // Write cookies to document.cookie
          if (typeof document !== 'undefined') {
            cookiesToSet.forEach(({ name, value, options }) => {
              let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`

              if (options?.maxAge) {
                cookieString += `; Max-Age=${options.maxAge}`
              }
              if (options?.path) {
                cookieString += `; Path=${options.path}`
              } else {
                cookieString += '; Path=/'
              }
              if (options?.domain) {
                cookieString += `; Domain=${options.domain}`
              }
              if (options?.sameSite) {
                cookieString += `; SameSite=${options.sameSite}`
              } else {
                cookieString += '; SameSite=Lax'
              }
              if (options?.secure) {
                cookieString += '; Secure'
              }

              document.cookie = cookieString
            })
          }
        },
      },
    }
  )
}
