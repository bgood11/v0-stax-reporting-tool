import { NextRequest, NextResponse } from 'next/server';
import { syncDataToMemory, getLastSyncStatus, getSyncHistory, getSyncedData } from '@/lib/sync-service';
import { createError, handleSalesforceError, logError } from '@/lib/error-handler';
import { createErrorResponse, createServerErrorResponse } from '@/lib/error-response';

const CONTEXT = 'sync';

// GET - Get sync status and history
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    if (action === 'status') {
      const lastSync = await getLastSyncStatus();
      return NextResponse.json({
        lastSync,
        recordCount: lastSync?.records_synced || 0,
      });
    }

    if (action === 'history') {
      const history = await getSyncHistory(10);
      return NextResponse.json({
        history,
      });
    }

    if (action === 'data') {
      // Return a sample of synced data for testing
      const data = await getSyncedData(10);
      return NextResponse.json({
        recordCount: data.length,
        sample: data,
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
  } catch (error: any) {
    return createServerErrorResponse(error, `${CONTEXT}/GET`);
  }
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
      // Determine error type based on error message
      let error = createError(
        'SYNC_FAILED',
        result.error || 'Unknown sync error',
        {
          userMessage: 'Unable to sync data from Salesforce. Click retry to try again.'
        }
      );

      // Check if it's a Salesforce auth error
      if (result.error?.includes('INVALID_AUTH') || result.error?.includes('invalid_client')) {
        error = createError(
          'AUTH_ERROR',
          result.error,
          {
            userMessage: 'Salesforce credentials are invalid. Please contact an administrator.'
          }
        );
      }

      return createErrorResponse(error, CONTEXT);
    }
  } catch (error: any) {
    // Try to handle as Salesforce error first
    if (error.message?.includes('Salesforce') || error.errorCode) {
      const sfError = handleSalesforceError(error);
      return createErrorResponse(sfError, CONTEXT);
    }

    // Fall back to generic server error
    return createServerErrorResponse(error, CONTEXT);
  }
}
