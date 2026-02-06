import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')
  const origin = requestUrl.origin

  console.log('[Auth Callback Route] Processing callback', {
    hasCode: !!code,
    error,
    errorDescription
  })

  // Handle errors from Supabase
  if (error) {
    console.error('[Auth Callback Route] Error from Supabase:', error, errorDescription)
    return NextResponse.redirect(
      `${origin}/?error=auth_error&message=${encodeURIComponent(errorDescription || error)}`
    )
  }

  if (code) {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch (error) {
              // This can be ignored in Server Components
              console.log('[Auth Callback Route] Cookie set error (may be expected):', error)
            }
          },
        },
      }
    )

    try {
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        console.error('[Auth Callback Route] Exchange error:', exchangeError)
        return NextResponse.redirect(
          `${origin}/?error=auth_error&message=${encodeURIComponent(exchangeError.message)}`
        )
      }

      if (data?.session) {
        console.log('[Auth Callback Route] Session created successfully')
        return NextResponse.redirect(`${origin}/dashboard`)
      }

      console.error('[Auth Callback Route] No session returned')
      return NextResponse.redirect(
        `${origin}/?error=auth_error&message=No%20session%20created`
      )
    } catch (err: any) {
      console.error('[Auth Callback Route] Unexpected error:', err)
      return NextResponse.redirect(
        `${origin}/?error=auth_error&message=${encodeURIComponent(err.message || 'Authentication failed')}`
      )
    }
  }

  // No code provided
  console.error('[Auth Callback Route] No code in URL')
  return NextResponse.redirect(
    `${origin}/?error=auth_error&message=No%20authentication%20code%20received`
  )
}
