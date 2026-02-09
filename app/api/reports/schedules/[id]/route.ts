import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getScheduledReport,
  updateScheduledReport,
  deleteScheduledReport,
  getScheduledReportRuns,
} from '@/lib/scheduled-report-service';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  // Verify auth
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const schedule = await getScheduledReport(id, user.id);
    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    // Also fetch recent runs
    const runs = await getScheduledReportRuns(id, 10);

    return NextResponse.json({ schedule, runs });
  } catch (error: unknown) {
    console.error('Failed to get scheduled report:', error);
    return NextResponse.json(
      { error: 'Failed to get scheduled report' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  // Verify auth
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Validate schedule_type if provided
    if (body.schedule_type && !['daily', 'weekly', 'monthly'].includes(body.schedule_type)) {
      return NextResponse.json(
        { error: 'Invalid schedule_type. Must be daily, weekly, or monthly' },
        { status: 400 }
      );
    }

    // Validate recipients if provided
    if (body.recipients) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const invalidEmails = body.recipients.filter((email: string) => !emailRegex.test(email));
      if (invalidEmails.length > 0) {
        return NextResponse.json(
          { error: `Invalid email addresses: ${invalidEmails.join(', ')}` },
          { status: 400 }
        );
      }
    }

    const schedule = await updateScheduledReport(id, user.id, body);
    return NextResponse.json({ schedule });
  } catch (error: unknown) {
    console.error('Failed to update scheduled report:', error);
    return NextResponse.json(
      { error: 'Failed to update scheduled report' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  // Verify auth
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    await deleteScheduledReport(id, user.id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Failed to delete scheduled report:', error);
    return NextResponse.json(
      { error: 'Failed to delete scheduled report' },
      { status: 500 }
    );
  }
}
