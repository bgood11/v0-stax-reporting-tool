import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateReport } from '@/lib/report-service';
import type { ReportConfig } from '@/lib/types';

export async function POST(request: NextRequest) {
  // Verify auth
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const body = await request.json();

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

    // Generate the report
    const result = await generateReport(config, user.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Report generation failed' },
        { status: 500 }
      );
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
    console.error('Report generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
