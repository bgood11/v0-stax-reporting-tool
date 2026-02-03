import { NextRequest, NextResponse } from 'next/server';
import { verifyMagicToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/?error=missing_token', request.url));
  }

  const result = await verifyMagicToken(token);

  if (!result.success) {
    return NextResponse.redirect(new URL(`/?error=${result.error}`, request.url));
  }

  // Set session cookie and redirect to dashboard
  const response = NextResponse.redirect(new URL('/dashboard', request.url));
  response.cookies.set('session', result.sessionToken!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 // 7 days
  });

  return response;
}
