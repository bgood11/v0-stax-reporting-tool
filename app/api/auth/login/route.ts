import { NextRequest, NextResponse } from 'next/server';
import { sendMagicLink } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const { email } = await request.json();

  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 });
  }

  const result = await sendMagicLink(email.toLowerCase().trim());

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // In demo mode, return the magic link for easy testing
  return NextResponse.json({
    success: true,
    // Include magic link in response for demo purposes
    ...(result.magicLink && { magicLink: result.magicLink })
  });
}
