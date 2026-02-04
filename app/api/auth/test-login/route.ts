import { NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';

// TEMPORARY: Test login bypass for development
// Remove this file before production!

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || 'demo-secret-key-for-development-only'
);

export async function GET() {
  const email = process.env.GLOBAL_ADMIN_EMAIL || 'barney.goodman@sherminfinance.co.uk';

  // Find or create user
  let user = db.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1').get(email);

  if (!user) {
    // Create the user
    const userId = uuidv4();
    db.prepare('INSERT INTO users (id, email, name, role) VALUES (?, ?, ?, ?)').run(
      userId, email, 'Barney Goodman', 'global_admin'
    );
    user = { id: userId, email, name: 'Barney Goodman', role: 'global_admin' };
  }

  // Create session
  const sessionId = uuidv4();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

  db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(
    sessionId, user.id, expiresAt
  );

  // Create JWT
  const token = await new SignJWT({
    sessionId,
    userId: user.id,
    email: user.email,
    role: user.role
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(secret);

  // Redirect to dashboard with session cookie
  const response = NextResponse.redirect(new URL('/dashboard', process.env.NEXTAUTH_URL || 'https://v0-stax-reporting-tool.vercel.app'));

  response.cookies.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/',
  });

  return response;
}
