import { NextRequest, NextResponse } from 'next/server';
import { syncDataToMemory } from '@/lib/sync-service';

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel adds this automatically)
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('Cron sync triggered at', new Date().toISOString());

  try {
    const result = await syncDataToMemory();

    console.log('Cron sync completed:', result);

    return NextResponse.json({
      success: true,
      message: `Synced ${result.recordCount} records from Salesforce`,
      recordCount: result.recordCount,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Cron sync failed:', error.message);

    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
