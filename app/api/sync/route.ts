import { NextRequest, NextResponse } from 'next/server';
import { syncDataToMemory, getLastSyncStatus, getSyncHistory, getSyncedData } from '@/lib/sync-service';

// GET - Get sync status and history
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'status') {
    return NextResponse.json({
      lastSync: getLastSyncStatus(),
      recordCount: getSyncedData().length,
    });
  }

  if (action === 'history') {
    return NextResponse.json({
      history: getSyncHistory(10),
    });
  }

  if (action === 'data') {
    // Return a sample of synced data for testing
    const data = getSyncedData();
    return NextResponse.json({
      recordCount: data.length,
      sample: data.slice(0, 10),
    });
  }

  return NextResponse.json({
    message: 'Sync API',
    endpoints: {
      'GET ?action=status': 'Get last sync status',
      'GET ?action=history': 'Get sync history',
      'GET ?action=data': 'Get sample of synced data',
      'POST': 'Trigger a manual sync',
    },
  });
}

// POST - Trigger a manual sync
export async function POST(request: NextRequest) {
  try {
    console.log('Manual sync triggered');

    const result = await syncDataToMemory();

    if (result.success) {
      const methodInfo = result.method === 'soql'
        ? '(via SOQL - full dataset)'
        : '(via Reports API - limited to 2,000 rows)';

      return NextResponse.json({
        success: true,
        message: `Successfully synced ${result.recordCount} records from Salesforce ${methodInfo}`,
        recordCount: result.recordCount,
        method: result.method || 'unknown',
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error,
        message: 'Sync failed - check Salesforce credentials and configuration',
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Sync error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
