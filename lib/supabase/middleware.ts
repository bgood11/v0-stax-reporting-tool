import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Define public routes that don't need auth
  const publicPaths = ['/', '/auth/callback', '/api/cron/sync']
  const isPublicPath = publicPaths.some(path =>
    request.nextUrl.pathname === path ||
    request.nextUrl.pathname.startsWith('/api/auth/')
  )

  // Handle unauthenticated requests
  if (!user && !isPublicPath) {
    // For API routes, return 401 JSON response (not redirect)
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Not authenticated', code: 'AUTH_ERROR', retryable: false },
        { status: 401 }
      )
    }

    // For page routes, redirect to login
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // Redirect to dashboard if authenticated and on login page
  if (user && request.nextUrl.pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
