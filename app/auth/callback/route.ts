import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/dashboard'

  console.log('Auth callback received:', { code: !!code, token_hash: !!token_hash, type })

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
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  // Handle PKCE flow (code parameter)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    console.log('Code exchange result:', error ? error.message : 'success')

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Handle token_hash flow (email verification)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'signup' | 'email' | 'magiclink',
    })
    console.log('Token hash verification result:', error ? error.message : 'success')

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // If there's an error or no valid params, redirect to login with error
  console.log('Auth callback failed - no valid code or token_hash')
  return NextResponse.redirect(`${origin}/?error=auth_callback_error`)
}
