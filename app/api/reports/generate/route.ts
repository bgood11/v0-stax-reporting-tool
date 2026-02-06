import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateReport } from '@/lib/report-service';
import { getAuthContext } from '@/lib/middleware/auth';
import { validateReportInput, createError, logError } from '@/lib/error-handler';
import { createErrorResponse, createAuthErrorResponse, createForbiddenErrorResponse } from '@/lib/error-response';
import type { ReportConfig } from '@/lib/types';

const CONTEXT = 'reports/generate';

export async function POST(request: NextRequest) {
  // Verify auth and get user context
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return createAuthErrorResponse(CONTEXT);
  }

  // Get auth context for BDM data isolation
  let authContext;
  try {
    authContext = await getAuthContext();
  } catch (contextError: any) {
    const error = createError('FORBIDDEN', contextError.message);
    return createErrorResponse(error, CONTEXT);
  }

  try {
    const body = await request.json();

    // Validate input
    const validationError = validateReportInput(body);
    if (validationError) {
      return createErrorResponse(validationError, CONTEXT);
    }

    // Build report config from request
    const config: ReportConfig = {
      name: body.name || 'Custom Report',
      reportType: body.reportType || 'AD',
      groupBy: body.groupBy || [],
      metrics: body.metrics || [],
      filters: {
        dateFrom: body.dateFrom,
        dateTo: body.dateTo,
        lenders: body.lenders,
        retailers: body.retailers,
        statuses: body.statuses,
        primeSubprime: body.primeSubprime,
        bdms: body.bdms,
        financeProducts: body.financeProducts
      },
      presetId: body.presetId
    };

    // Generate the report with auth context for BDM filtering
    const result = await generateReport(config, user.id, authContext);

    if (!result.success) {
      const error = createError(
        'SERVER_ERROR',
        result.error || 'Report generation failed',
        {
          userMessage: 'Unable to generate report. Please try again or contact support.'
        }
      );
      return createErrorResponse(error, CONTEXT);
    }

    return NextResponse.json({
      data: result.data,
      summary: result.summary,
      reportId: result.reportId,
      pagination: {
        page: 1,
        pageSize: result.data?.length || 0,
        total: result.data?.length || 0,
        totalPages: 1
      }
    });

  } catch (error: any) {
    const appError = createError(
      'SERVER_ERROR',
      error.message || 'Report generation failed',
      {
        details: {
          errorName: error.name,
          stack: error.stack?.split('\n').slice(0, 3).join('\n')
        }
      }
    );
    return createErrorResponse(appError, CONTEXT);
  }
}
