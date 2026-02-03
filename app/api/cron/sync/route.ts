import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel adds this automatically)
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // In demo mode, just return a success message
  // In production with jsforce, this would trigger the Salesforce sync
  console.log('Cron sync triggered - demo mode');

  return NextResponse.json({
    success: true,
    message: 'Sync would run in production with Salesforce integration',
    timestamp: new Date().toISOString()
  });
}
