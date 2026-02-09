import { createClient } from '@/lib/supabase/server';

export interface ScheduledReport {
  id: string;
  user_id: string;
  name: string;
  config: {
    reportType: string;
    groupBy: string[];
    metrics: string[];
    dateFrom?: string;
    dateTo?: string;
    dateRange?: string;
    lenders?: string[];
    retailers?: string[];
    statuses?: string[];
    bdms?: string[];
    financeProducts?: string[];
    primeSubprime?: string[];
  };
  schedule_type: 'daily' | 'weekly' | 'monthly';
  schedule_day?: number;
  schedule_time: string;
  recipients: string[];
  is_active: boolean;
  last_run_at?: string;
  next_run_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ScheduledReportRun {
  id: string;
  scheduled_report_id: string;
  started_at: string;
  completed_at?: string;
  status: 'running' | 'success' | 'failed';
  record_count?: number;
  result_summary?: {
    totalRecords: number;
    totalLoanValue: number;
    totalCommission: number;
    approvalRate: number;
  };
  error_message?: string;
  email_sent: boolean;
}

export interface CreateScheduledReportInput {
  name: string;
  config: ScheduledReport['config'];
  schedule_type: 'daily' | 'weekly' | 'monthly';
  schedule_day?: number;
  schedule_time: string;
  recipients: string[];
}

/**
 * Get all scheduled reports for a user
 */
export async function getScheduledReports(userId: string): Promise<ScheduledReport[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('scheduled_reports')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching scheduled reports:', error);
    throw new Error('Failed to fetch scheduled reports');
  }

  return data || [];
}

/**
 * Get a single scheduled report by ID
 */
export async function getScheduledReport(id: string, userId: string): Promise<ScheduledReport | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('scheduled_reports')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Error fetching scheduled report:', error);
    throw new Error('Failed to fetch scheduled report');
  }

  return data;
}

/**
 * Create a new scheduled report
 */
export async function createScheduledReport(
  userId: string,
  input: CreateScheduledReportInput
): Promise<ScheduledReport> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('scheduled_reports')
    .insert({
      user_id: userId,
      name: input.name,
      config: input.config,
      schedule_type: input.schedule_type,
      schedule_day: input.schedule_day,
      schedule_time: input.schedule_time,
      recipients: input.recipients,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating scheduled report:', error);
    throw new Error('Failed to create scheduled report');
  }

  return data;
}

/**
 * Update a scheduled report
 */
export async function updateScheduledReport(
  id: string,
  userId: string,
  updates: Partial<CreateScheduledReportInput & { is_active: boolean }>
): Promise<ScheduledReport> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('scheduled_reports')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating scheduled report:', error);
    throw new Error('Failed to update scheduled report');
  }

  return data;
}

/**
 * Delete a scheduled report
 */
export async function deleteScheduledReport(id: string, userId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('scheduled_reports')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting scheduled report:', error);
    throw new Error('Failed to delete scheduled report');
  }
}

/**
 * Toggle scheduled report active status
 */
export async function toggleScheduledReportStatus(
  id: string,
  userId: string,
  isActive: boolean
): Promise<ScheduledReport> {
  return updateScheduledReport(id, userId, { is_active: isActive });
}

/**
 * Get scheduled reports due to run (for cron job)
 */
export async function getDueScheduledReports(): Promise<ScheduledReport[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('scheduled_reports')
    .select('*')
    .eq('is_active', true)
    .lte('next_run_at', new Date().toISOString())
    .order('next_run_at', { ascending: true });

  if (error) {
    console.error('Error fetching due scheduled reports:', error);
    throw new Error('Failed to fetch due scheduled reports');
  }

  return data || [];
}

/**
 * Create a run record for a scheduled report
 */
export async function createScheduledReportRun(
  scheduledReportId: string
): Promise<ScheduledReportRun> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('scheduled_report_runs')
    .insert({
      scheduled_report_id: scheduledReportId,
      status: 'running',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating scheduled report run:', error);
    throw new Error('Failed to create scheduled report run');
  }

  return data;
}

/**
 * Update a run record with completion status
 */
export async function completeScheduledReportRun(
  runId: string,
  status: 'success' | 'failed',
  result?: {
    record_count?: number;
    result_summary?: ScheduledReportRun['result_summary'];
    error_message?: string;
    email_sent?: boolean;
  }
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('scheduled_report_runs')
    .update({
      status,
      completed_at: new Date().toISOString(),
      ...result,
    })
    .eq('id', runId);

  if (error) {
    console.error('Error completing scheduled report run:', error);
    throw new Error('Failed to complete scheduled report run');
  }
}

/**
 * Update the scheduled report after a run
 */
export async function updateScheduledReportAfterRun(
  id: string,
  nextRunAt: string
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('scheduled_reports')
    .update({
      last_run_at: new Date().toISOString(),
      next_run_at: nextRunAt,
    })
    .eq('id', id);

  if (error) {
    console.error('Error updating scheduled report after run:', error);
    throw new Error('Failed to update scheduled report after run');
  }
}

/**
 * Get run history for a scheduled report
 */
export async function getScheduledReportRuns(
  scheduledReportId: string,
  limit: number = 10
): Promise<ScheduledReportRun[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('scheduled_report_runs')
    .select('*')
    .eq('scheduled_report_id', scheduledReportId)
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching scheduled report runs:', error);
    throw new Error('Failed to fetch scheduled report runs');
  }

  return data || [];
}
