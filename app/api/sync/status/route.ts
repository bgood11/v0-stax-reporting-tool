import { NextRequest, NextResponse } from 'next/server';
import { getLastSyncStatus } from '@/lib/sync-service';

/**
 * GET /api/sync/status
 * Returns the last sync status from the sync_log table
 * Includes: timestamp, status, records_synced, error_message
 */
export async function GET(request: NextRequest) {
  try {
    const lastSync = await getLastSyncStatus();

    if (!lastSync) {
      return NextResponse.json({
        lastSync: null,
        message: 'No sync history available',
      });
    }

    return NextResponse.json({
      lastSync: {
        id: lastSync.id,
        started_at: lastSync.started_at,
        completed_at: lastSync.completed_at,
        status: lastSync.status,
        records_synced: lastSync.records_synced || 0,
        error_message: lastSync.error_message,
      },
      recordCount: lastSync.records_synced || 0,
    });
  } catch (error: any) {
    console.error('Failed to get sync status:', error);
    return NextResponse.json(
      {
        error: 'Failed to get sync status',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
