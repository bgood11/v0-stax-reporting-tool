import { NextRequest, NextResponse } from 'next/server';
import {
  getDueScheduledReports,
  createScheduledReportRun,
  completeScheduledReportRun,
  updateScheduledReportAfterRun,
  type ScheduledReport,
} from '@/lib/scheduled-report-service';
import { generateReport } from '@/lib/report-service';
import { generateExcelReport } from '@/lib/export-service';
import type { ReportConfig, ReportFilters, ReportSummary } from '@/lib/types';

/**
 * Calculate the next run time based on schedule configuration
 */
function calculateNextRunTime(schedule: ScheduledReport): string {
  const now = new Date();
  const time = schedule.schedule_time.split(':');
  const hours = parseInt(time[0], 10);
  const minutes = parseInt(time[1], 10);

  let nextRun = new Date(now);
  nextRun.setHours(hours, minutes, 0, 0);

  switch (schedule.schedule_type) {
    case 'daily':
      // If today's time has passed, move to tomorrow
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
      break;

    case 'weekly':
      // Find the next occurrence of the specified day
      const targetDay = schedule.schedule_day ?? 1; // Default to Monday
      const currentDay = nextRun.getDay();
      let daysUntilTarget = targetDay - currentDay;

      if (daysUntilTarget < 0 || (daysUntilTarget === 0 && nextRun <= now)) {
        daysUntilTarget += 7;
      }

      nextRun.setDate(nextRun.getDate() + daysUntilTarget);
      break;

    case 'monthly':
      // Find the next occurrence of the specified day of month
      const targetDom = schedule.schedule_day ?? 1;

      if (nextRun.getDate() < targetDom) {
        // This month
        nextRun.setDate(targetDom);
      } else if (nextRun.getDate() === targetDom && nextRun > now) {
        // Today, time hasn't passed
        // Already set correctly
      } else {
        // Next month
        nextRun.setMonth(nextRun.getMonth() + 1);
        nextRun.setDate(targetDom);
      }
      break;
  }

  return nextRun.toISOString();
}

/**
 * Send report email using Resend or fallback
 */
async function sendReportEmail(
  recipients: string[],
  reportName: string,
  summary: ReportSummary,
  excelBuffer: Buffer
): Promise<boolean> {
  // Check if Resend API key is configured
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!resendApiKey) {
    console.log('RESEND_API_KEY not configured, skipping email');
    return false;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'reports@sherminfinance.co.uk',
        to: recipients,
        subject: `Scheduled Report: ${reportName}`,
        html: `
          <h2>Scheduled Report: ${reportName}</h2>
          <p>Your scheduled report has been generated.</p>
          <h3>Summary</h3>
          <ul>
            <li><strong>Total Records:</strong> ${summary.totalRecords.toLocaleString()}</li>
            <li><strong>Total Loan Value:</strong> £${summary.totalLoanValue.toLocaleString()}</li>
            <li><strong>Total Commission:</strong> £${summary.totalCommission.toLocaleString()}</li>
            <li><strong>Approval Rate:</strong> ${summary.approvalRate.toFixed(1)}%</li>
          </ul>
          <p>Please find the full report attached.</p>
          <p>This is an automated email from the Stax Reporting Tool.</p>
        `,
        attachments: [
          {
            filename: `${reportName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.xlsx`,
            content: excelBuffer.toString('base64'),
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to send email:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

/**
 * Execute a single scheduled report
 */
async function executeScheduledReport(schedule: ScheduledReport): Promise<void> {
  console.log(`Executing scheduled report: ${schedule.name} (${schedule.id})`);

  // Create a run record
  const run = await createScheduledReportRun(schedule.id);

  try {
    // Build report filters from schedule config
    const filters: ReportFilters = {
      lenders: schedule.config.lenders,
      retailers: schedule.config.retailers,
      statuses: schedule.config.statuses,
      bdms: schedule.config.bdms,
      financeProducts: schedule.config.financeProducts,
      primeSubprime: schedule.config.primeSubprime as ('Prime' | 'Sub-Prime')[] | undefined,
    };

    // Add date range if specified
    if (schedule.config.dateFrom && schedule.config.dateTo) {
      filters.dateRange = {
        start: schedule.config.dateFrom,
        end: schedule.config.dateTo,
      };
    }

    // Build report config
    const reportConfig: ReportConfig = {
      reportType: (schedule.config.reportType || 'AD') as 'AD' | 'AP',
      groupBy: schedule.config.groupBy || [],
      metrics: schedule.config.metrics || [],
      filters,
    };

    // Generate the report
    const result = await generateReport(reportConfig);

    // Ensure we have data and summary
    const data = result.data || [];
    const summary: ReportSummary = result.summary || {
      totalRecords: 0,
      totalLoanValue: 0,
      totalCommission: 0,
      approvalRate: 0,
      executionRate: 0,
    };

    // Generate Excel file
    const excelBuffer = await generateExcelReport({
      data,
      summary,
      reportName: schedule.name,
    });

    // Send email to recipients
    const emailSent = await sendReportEmail(
      schedule.recipients,
      schedule.name,
      summary,
      excelBuffer
    );

    // Mark run as successful
    await completeScheduledReportRun(run.id, 'success', {
      record_count: data.length,
      result_summary: {
        totalRecords: summary.totalRecords,
        totalLoanValue: summary.totalLoanValue,
        totalCommission: summary.totalCommission,
        approvalRate: summary.approvalRate,
      },
      email_sent: emailSent,
    });

    // Calculate and update next run time
    const nextRunAt = calculateNextRunTime(schedule);
    await updateScheduledReportAfterRun(schedule.id, nextRunAt);

    console.log(`Successfully executed scheduled report: ${schedule.name}`);
  } catch (error) {
    console.error(`Failed to execute scheduled report: ${schedule.name}`, error);

    // Mark run as failed
    await completeScheduledReportRun(run.id, 'failed', {
      error_message: error instanceof Error ? error.message : 'Unknown error',
    });

    // Still update next run time so it tries again
    const nextRunAt = calculateNextRunTime(schedule);
    await updateScheduledReportAfterRun(schedule.id, nextRunAt);
  }
}

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel Cron adds this header)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.warn('Unauthorized cron request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('Starting scheduled reports cron job');

  try {
    // Get all due scheduled reports
    const dueReports = await getDueScheduledReports();
    console.log(`Found ${dueReports.length} scheduled reports to execute`);

    // Execute each report
    const results = await Promise.allSettled(
      dueReports.map(schedule => executeScheduledReport(schedule))
    );

    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`Cron job completed: ${succeeded} succeeded, ${failed} failed`);

    return NextResponse.json({
      success: true,
      processed: dueReports.length,
      succeeded,
      failed,
    });
  } catch (error) {
    console.error('Cron job failed:', error);
    return NextResponse.json(
      { error: 'Cron job failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
