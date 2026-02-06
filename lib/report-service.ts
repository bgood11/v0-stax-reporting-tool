// Report generation service - queries Supabase and generates reports
import { createAdminClient } from './supabase/server';
import type {
  ApplicationDecision,
  ReportConfig,
  ReportFilters,
  ReportSummary
} from './types';

interface ReportResult {
  success: boolean;
  data?: any[];
  summary?: ReportSummary;
  error?: string;
  reportId?: string;
}

interface GroupedData {
  [key: string]: ApplicationDecision[];
}

/**
 * Generate a report based on config
 */
export async function generateReport(
  config: ReportConfig,
  userId?: string
): Promise<ReportResult> {
  const supabase = createAdminClient();

  try {
    // Build query with filters
    let query = supabase.from('application_decisions').select('*');

    // Apply filters
    if (config.filters) {
      query = applyFilters(query, config.filters);
    }

    const { data: rawData, error } = await query;

    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }

    if (!rawData || rawData.length === 0) {
      return {
        success: true,
        data: [],
        summary: {
          totalRecords: 0,
          totalLoanValue: 0,
          totalCommission: 0,
          averageLoanAmount: 0,
          approvalRate: 0,
          executionRate: 0
        }
      };
    }

    // Group data if groupBy is specified
    let resultData: any[];
    if (config.groupBy && config.groupBy.length > 0) {
      resultData = groupAndAggregate(rawData, config.groupBy, config.metrics || []);
    } else {
      resultData = rawData;
    }

    // Calculate summary stats
    const summary = calculateSummary(rawData);

    // Save to report history if userId provided
    let reportId: string | undefined;
    if (userId) {
      const { data: savedReport, error: saveError } = await supabase
        .from('generated_reports')
        .insert({
          user_id: userId,
          preset_id: config.presetId || null,
          name: config.name || 'Custom Report',
          config: config,
          result_summary: summary,
          record_count: rawData.length
        })
        .select()
        .single();

      if (!saveError && savedReport) {
        reportId = savedReport.id;
      }
    }

    return {
      success: true,
      data: resultData,
      summary,
      reportId
    };

  } catch (error: any) {
    console.error('Report generation failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Apply filters to query
 */
function applyFilters(query: any, filters: ReportFilters): any {
  if (filters.dateFrom) {
    query = query.gte('submitted_date', filters.dateFrom);
  }

  if (filters.dateTo) {
    query = query.lte('submitted_date', filters.dateTo);
  }

  if (filters.lenders && filters.lenders.length > 0) {
    query = query.in('lender_name', filters.lenders);
  }

  if (filters.retailers && filters.retailers.length > 0) {
    query = query.in('retailer_name', filters.retailers);
  }

  if (filters.statuses && filters.statuses.length > 0) {
    query = query.in('status', filters.statuses);
  }

  if (filters.primeSubprime && filters.primeSubprime.length > 0) {
    query = query.in('prime_subprime', filters.primeSubprime);
  }

  if (filters.bdms && filters.bdms.length > 0) {
    query = query.in('bdm_name', filters.bdms);
  }

  if (filters.financeProducts && filters.financeProducts.length > 0) {
    query = query.in('finance_product', filters.financeProducts);
  }

  return query;
}

/**
 * Group data and calculate aggregates
 */
function groupAndAggregate(
  data: ApplicationDecision[],
  groupBy: string[],
  metrics: string[]
): any[] {
  // Create composite group key
  const grouped: GroupedData = {};

  for (const record of data) {
    const keyParts = groupBy.map(field => {
      if (field === 'month') {
        return record.submitted_date ? record.submitted_date.substring(0, 7) : 'Unknown';
      }
      if (field === 'week') {
        return record.submitted_date ? getWeekStart(record.submitted_date) : 'Unknown';
      }
      return (record as any)[field] || 'Unknown';
    });
    const key = keyParts.join('|||');

    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(record);
  }

  // Calculate metrics for each group
  const results: any[] = [];

  for (const [key, records] of Object.entries(grouped)) {
    const keyParts = key.split('|||');
    const row: any = {};

    // Add group-by fields
    groupBy.forEach((field, index) => {
      row[field] = keyParts[index];
    });

    // Calculate all metrics
    row.volume = records.length;
    row.loan_value = records.reduce((sum, r) => sum + (r.loan_amount || 0), 0);
    row.commission = records.reduce((sum, r) => sum + (r.commission_amount || 0), 0);
    row.average_loan = row.volume > 0 ? row.loan_value / row.volume : 0;

    // Status-based metrics
    const approved = records.filter(r => ['Approved', 'Executed', 'Live'].includes(r.status || '')).length;
    const declined = records.filter(r => r.status === 'Declined').length;
    const executed = records.filter(r => ['Executed', 'Live'].includes(r.status || '')).length;
    const live = records.filter(r => r.status === 'Live').length;

    row.approved_count = approved;
    row.declined_count = declined;
    row.executed_count = executed;
    row.live_count = live;

    // Rates
    const decisioned = approved + declined;
    row.approval_rate = decisioned > 0 ? (approved / decisioned) * 100 : 0;
    row.execution_rate = approved > 0 ? (executed / approved) * 100 : 0;
    row.completion_rate = executed > 0 ? (live / executed) * 100 : 0;

    results.push(row);
  }

  // Sort by volume descending
  results.sort((a, b) => b.volume - a.volume);

  return results;
}

/**
 * Calculate summary statistics
 */
function calculateSummary(data: ApplicationDecision[]): ReportSummary {
  const totalRecords = data.length;
  const totalLoanValue = data.reduce((sum, r) => sum + (r.loan_amount || 0), 0);
  const totalCommission = data.reduce((sum, r) => sum + (r.commission_amount || 0), 0);
  const averageLoanAmount = totalRecords > 0 ? totalLoanValue / totalRecords : 0;

  // Calculate rates
  const approved = data.filter(r => ['Approved', 'Executed', 'Live'].includes(r.status || '')).length;
  const declined = data.filter(r => r.status === 'Declined').length;
  const executed = data.filter(r => ['Executed', 'Live'].includes(r.status || '')).length;

  const decisioned = approved + declined;
  const approvalRate = decisioned > 0 ? (approved / decisioned) * 100 : 0;
  const executionRate = approved > 0 ? (executed / approved) * 100 : 0;

  return {
    totalRecords,
    totalLoanValue,
    totalCommission,
    averageLoanAmount,
    approvalRate,
    executionRate
  };
}

/**
 * Get ISO week start date
 */
function getWeekStart(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const weekStart = new Date(date.setDate(diff));
  return weekStart.toISOString().substring(0, 10);
}

/**
 * Get filter options from the database (distinct values)
 */
export async function getFilterOptions(): Promise<{
  lenders: string[];
  retailers: string[];
  statuses: string[];
  primeSubprime: string[];
  bdms: string[];
  financeProducts: string[];
  dateRange: { min: string | null; max: string | null };
}> {
  const supabase = createAdminClient();

  // Get distinct values for each filter field
  const [lenders, retailers, statuses, primeSubprime, bdms, products, dateRange] = await Promise.all([
    supabase.from('application_decisions').select('lender_name').order('lender_name'),
    supabase.from('application_decisions').select('retailer_name').order('retailer_name'),
    supabase.from('application_decisions').select('status').order('status'),
    supabase.from('application_decisions').select('prime_subprime').order('prime_subprime'),
    supabase.from('application_decisions').select('bdm_name').order('bdm_name'),
    supabase.from('application_decisions').select('finance_product').order('finance_product'),
    supabase.from('application_decisions')
      .select('submitted_date')
      .order('submitted_date', { ascending: true })
      .limit(1)
      .then(async (min) => {
        const max = await supabase.from('application_decisions')
          .select('submitted_date')
          .order('submitted_date', { ascending: false })
          .limit(1);
        return {
          min: min.data?.[0]?.submitted_date || null,
          max: max.data?.[0]?.submitted_date || null
        };
      })
  ]);

  // Extract unique values
  const unique = (arr: any[], field: string) =>
    [...new Set(arr?.map(r => r[field]).filter(Boolean))].sort();

  return {
    lenders: unique(lenders.data || [], 'lender_name'),
    retailers: unique(retailers.data || [], 'retailer_name'),
    statuses: unique(statuses.data || [], 'status'),
    primeSubprime: unique(primeSubprime.data || [], 'prime_subprime'),
    bdms: unique(bdms.data || [], 'bdm_name'),
    financeProducts: unique(products.data || [], 'finance_product'),
    dateRange
  };
}

/**
 * Get user's report history
 */
export async function getReportHistory(userId: string, limit: number = 20) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('generated_reports')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to get report history:', error);
    return [];
  }

  return data || [];
}

/**
 * Get report presets (built-in + user's custom)
 */
export async function getReportPresets(userId?: string) {
  const supabase = createAdminClient();

  let query = supabase
    .from('report_presets')
    .select('*')
    .order('name');

  if (userId) {
    // Get built-in presets OR user's own presets
    query = query.or(`is_built_in.eq.true,user_id.eq.${userId}`);
  } else {
    // Just built-in presets
    query = query.eq('is_built_in', true);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to get presets:', error);
    return [];
  }

  return data || [];
}

/**
 * Get dashboard stats
 */
export async function getDashboardStats() {
  const supabase = createAdminClient();

  // Get counts by status
  const { data: statusCounts, error: statusError } = await supabase
    .from('application_decisions')
    .select('status')
    .then(async (result) => {
      if (result.error) return { data: null, error: result.error };

      const counts: Record<string, number> = {};
      for (const row of result.data || []) {
        const status = row.status || 'Unknown';
        counts[status] = (counts[status] || 0) + 1;
      }
      return { data: counts, error: null };
    });

  if (statusError) {
    console.error('Failed to get status counts:', statusError);
  }

  // Get totals
  const { data: totals, error: totalsError } = await supabase
    .from('application_decisions')
    .select('loan_amount, commission_amount');

  if (totalsError) {
    console.error('Failed to get totals:', totalsError);
  }

  const totalApplications = totals?.length || 0;
  const totalLoanValue = totals?.reduce((sum, r) => sum + (r.loan_amount || 0), 0) || 0;
  const totalCommission = totals?.reduce((sum, r) => sum + (r.commission_amount || 0), 0) || 0;

  // Get last sync info
  const { data: lastSync } = await supabase
    .from('sync_log')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(1)
    .single();

  return {
    totalApplications,
    totalLoanValue,
    totalCommission,
    statusBreakdown: statusCounts || {},
    lastSync: lastSync || null
  };
}
