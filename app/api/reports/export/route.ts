import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const sessionToken = request.cookies.get('session')?.value;
  if (!sessionToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const auth = await verifySession(sessionToken);
  if (!auth.valid) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

  // For demo, return a message
  // In production with ExcelJS, this would generate and return a real Excel file
  return NextResponse.json({
    message: 'Excel export feature available in production deployment',
    note: 'Deploy to Vercel where native packages like ExcelJS can be installed'
  });
}
