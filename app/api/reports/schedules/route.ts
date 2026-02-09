import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getScheduledReports,
  createScheduledReport,
  type CreateScheduledReportInput,
} from '@/lib/scheduled-report-service';

export async function GET() {
  // Verify auth
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const schedules = await getScheduledReports(user.id);
    return NextResponse.json({ schedules });
  } catch (error: unknown) {
    console.error('Failed to get scheduled reports:', error);
    return NextResponse.json(
      { error: 'Failed to get scheduled reports' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Verify auth
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const body = await request.json() as CreateScheduledReportInput;

    // Validate required fields
    if (!body.name || !body.config || !body.schedule_type || !body.recipients?.length) {
      return NextResponse.json(
        { error: 'Missing required fields: name, config, schedule_type, recipients' },
        { status: 400 }
      );
    }

    // Validate schedule_type
    if (!['daily', 'weekly', 'monthly'].includes(body.schedule_type)) {
      return NextResponse.json(
        { error: 'Invalid schedule_type. Must be daily, weekly, or monthly' },
        { status: 400 }
      );
    }

    // Validate schedule_day for weekly/monthly
    if (body.schedule_type === 'weekly' && (body.schedule_day === undefined || body.schedule_day < 0 || body.schedule_day > 6)) {
      return NextResponse.json(
        { error: 'schedule_day must be 0-6 for weekly schedules' },
        { status: 400 }
      );
    }
    if (body.schedule_type === 'monthly' && (body.schedule_day === undefined || body.schedule_day < 1 || body.schedule_day > 31)) {
      return NextResponse.json(
        { error: 'schedule_day must be 1-31 for monthly schedules' },
        { status: 400 }
      );
    }

    // Validate recipients are valid emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = body.recipients.filter(email => !emailRegex.test(email));
    if (invalidEmails.length > 0) {
      return NextResponse.json(
        { error: `Invalid email addresses: ${invalidEmails.join(', ')}` },
        { status: 400 }
      );
    }

    const schedule = await createScheduledReport(user.id, body);
    return NextResponse.json({ schedule }, { status: 201 });
  } catch (error: unknown) {
    console.error('Failed to create scheduled report:', error);
    return NextResponse.json(
      { error: 'Failed to create scheduled report' },
      { status: 500 }
    );
  }
}
