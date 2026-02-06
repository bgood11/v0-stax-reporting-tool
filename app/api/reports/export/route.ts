import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateReport } from '@/lib/report-service';
import { generateExcelReport } from '@/lib/export-service';
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
    const format = body.format || 'csv';

    // Build report config
    const config: ReportConfig = {
      name: body.name || 'Export',
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
      }
    };

    // Generate the report data
    const result = await generateReport(config);

    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: result.error || 'Export failed' },
        { status: 500 }
      );
    }

    // Export as XLSX
    if (format === 'xlsx') {
      const timestamp = new Date().toISOString().split('T')[0];
      const buffer = await generateExcelReport({
        data: result.data,
        summary: result.summary,
        reportName: body.name || 'Stax Report'
      });

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="stax-report-${timestamp}.xlsx"`,
          'Content-Length': buffer.length.toString()
        }
      });
    }

    // Export as CSV
    if (format === 'csv') {
      const csv = convertToCSV(result.data);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="report_${Date.now()}.csv"`
        }
      });
    }

    // For JSON format
    return NextResponse.json({
      data: result.data,
      summary: result.summary
    });

  } catch (error: any) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: error.message || 'Export failed' },
      { status: 500 }
    );
  }
}

function convertToCSV(data: any[]): string {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const rows = data.map(row =>
    headers.map(header => {
      const value = row[header];
      // Escape quotes and wrap in quotes if contains comma
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value ?? '';
    }).join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}
