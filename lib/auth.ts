import { v4 as uuidv4 } from 'uuid';
import { SignJWT, jwtVerify } from 'jose';
import db from './db';

const secret = new TextEncoder().encode(process.env.AUTH_SECRET || 'demo-secret-key-for-development-only');

export async function sendMagicLink(email: string): Promise<{ success: boolean; error?: string; magicLink?: string }> {
  // Check if user exists and is active
  const user = db.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1').get(email) as any;

  if (!user) {
    return { success: false, error: 'User not found or inactive' };
  }

  // Generate token
  const token = uuidv4();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

  // Store token
  db.prepare(`
    INSERT INTO magic_tokens (id, email, token, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(uuidv4(), email, token, expiresAt);

  // Generate magic link
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const magicLink = `${baseUrl}/api/auth/verify?token=${token}`;

  // In demo mode, log the magic link to console
  console.log('\n========================================');
  console.log('MAGIC LINK (Demo Mode):');
  console.log(magicLink);
  console.log('========================================\n');

  // Try to send email if Resend is configured
  if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 're_xxxxxxxxxxxx') {
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@example.com',
        to: email,
        subject: 'Your Stax Reporting Tool login link',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #477085;">Stax Reporting Tool</h1>
            <p>Hi ${user.name},</p>
            <p>Click the button below to log in to the Stax Reporting Tool:</p>
            <a href="${magicLink}" style="display: inline-block; background: linear-gradient(to right, #477085, #2ab7e3); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 16px 0;">
              Log In
            </a>
            <p style="color: #666; font-size: 14px;">This link will expire in 15 minutes.</p>
            <p style="color: #666; font-size: 14px;">If you didn't request this link, you can safely ignore this email.</p>
          </div>
        `
      });
    } catch (error: any) {
      console.log('Email sending skipped (Resend not configured):', error.message);
    }
  }

  return { success: true, magicLink }; // Return magic link for demo
}

export async function verifyMagicToken(token: string): Promise<{ success: boolean; sessionToken?: string; error?: string }> {
  // Find token
  const magicToken = db.prepare(`
    SELECT * FROM magic_tokens
    WHERE token = ? AND used = 0 AND expires_at > datetime('now')
  `).get(token) as any;

  if (!magicToken) {
    return { success: false, error: 'Invalid or expired token' };
  }

  // Mark token as used
  db.prepare('UPDATE magic_tokens SET used = 1 WHERE id = ?').run(magicToken.id);

  // Get user
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(magicToken.email) as any;

  if (!user) {
    return { success: false, error: 'User not found' };
  }

  // Update last login
  db.prepare('UPDATE users SET last_login = ? WHERE id = ?').run(new Date().toISOString(), user.id);

  // Create session
  const sessionId = uuidv4();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

  db.prepare(`
    INSERT INTO sessions (id, user_id, expires_at)
    VALUES (?, ?, ?)
  `).run(sessionId, user.id, expiresAt);

  // Create JWT
  const jwt = await new SignJWT({ sessionId, userId: user.id, email: user.email, role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(secret);

  // Log audit
  db.prepare(`
    INSERT INTO audit_log (user_id, user_email, action, details)
    VALUES (?, ?, 'login', ?)
  `).run(user.id, user.email, JSON.stringify({ method: 'magic_link' }));

  return { success: true, sessionToken: jwt };
}

export async function verifySession(token: string): Promise<{ valid: boolean; user?: any }> {
  try {
    const { payload } = await jwtVerify(token, secret);

    // Check session still exists
    const session = db.prepare(`
      SELECT s.*, u.* FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ? AND s.expires_at > datetime('now') AND u.is_active = 1
    `).get(payload.sessionId) as any;

    if (!session) {
      return { valid: false };
    }

    return {
      valid: true,
      user: {
        id: session.user_id,
        email: session.email,
        name: session.name,
        role: session.role,
        assignedRetailers: JSON.parse(session.assigned_retailers || '[]')
      }
    };
  } catch {
    return { valid: false };
  }
}

export function logout(sessionId: string): void {
  db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
}
