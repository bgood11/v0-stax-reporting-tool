// Report generation service - queries Supabase and generates reports
import { createAdminClient } from './supabase/server';
import type {
  ApplicationDecision,
  ReportConfig,
  ReportFilters,
  ReportSummary
} from './types';
import type { AuthContext } from './middleware/auth';

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
 * Accepts optional authContext for BDM row-level security
 */
export async function generateReport(
  config: ReportConfig,
  userId?: string,
  authContext?: AuthContext
): Promise<ReportResult> {
  const supabase = createAdminClient();

  try {
    // Build query with filters
    // FIXED: Added high limit to bypass Supabase's default 1000 row limit
    let query = supabase.from('application_decisions').select('*').limit(500000);

    // Apply user-based filters for BDM data isolation
    if (authContext) {
      query = applyAuthFilters(query, authContext);
    }

    // Apply report-specific filters
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
 * Apply auth-based filters (BDM name assignments)
 * This ensures users only see data from their assigned BDM names
 *
 * - Admins: see all data
 * - Users with "ALL" assignment: see all data
 * - Users with specific BDM names: see only that data
 * - Users with no assignments: see no data
 */
function applyAuthFilters(query: any, authContext: AuthContext): any {
  // If user has full access (admin or "ALL" assignment), no filtering needed
  if (authContext.hasFullAccess) {
    return query;
  }

  // Filter to assigned BDM names
  if (authContext.assignedBdmNames.length > 0) {
    query = query.in('bdm_name', authContext.assignedBdmNames);
  } else {
    // No assignments = no data
    // Use a filter that returns no results
    query = query.eq('id', 'null-no-access');
  }

  return query;
}

/**
 * Apply report-specific filters (date ranges, statuses, etc)
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
 * Accepts optional authContext for BDM data filtering
 */
export async function getFilterOptions(authContext?: AuthContext): Promise<{
  lenders: string[];
  retailers: string[];
  statuses: string[];
  primeSubprime: string[];
  bdms: string[];
  financeProducts: string[];
  dateRange: { min: string | null; max: string | null };
}> {
  const supabase = createAdminClient();

  // If no auth context (admin), use efficient RPC function
  if (!authContext || authContext.hasFullAccess) {
    try {
      const { data: options, error } = await supabase.rpc('get_all_filter_options');

      if (!error && options) {
        return {
          lenders: options.lenders || [],
          retailers: options.retailers || [],
          statuses: options.statuses || [],
          primeSubprime: options.primeSubprime || [],
          bdms: options.bdms || [],
          financeProducts: options.financeProducts || [],
          dateRange: {
            min: options.dateRange?.min || null,
            max: options.dateRange?.max || null
          }
        };
      }
      console.error('RPC get_all_filter_options failed:', error);
    } catch (rpcError) {
      console.error('RPC call failed, using fallback:', rpcError);
    }
  }

  // Fallback: Use individual queries with auth filters
  // Use distinct select approach for efficiency
  const getDistinct = async (field: string): Promise<string[]> => {
    let query = supabase.from('application_decisions').select(field);
    if (authContext) {
      query = applyAuthFilters(query, authContext);
    }
    // Get a reasonable sample to extract distinct values
    const { data } = await query.limit(50000);
    const unique = [...new Set((data || []).map((r: any) => r[field]).filter(Boolean))];
    return unique.sort();
  };

  const [lenders, retailers, statuses, primeSubprime, bdms, financeProducts] = await Promise.all([
    getDistinct('lender_name'),
    getDistinct('retailer_name'),
    getDistinct('status'),
    getDistinct('prime_subprime'),
    getDistinct('bdm_name'),
    getDistinct('finance_product')
  ]);

  // Get date range
  let minQuery = supabase.from('application_decisions')
    .select('submitted_date')
    .order('submitted_date', { ascending: true })
    .limit(1);
  let maxQuery = supabase.from('application_decisions')
    .select('submitted_date')
    .order('submitted_date', { ascending: false })
    .limit(1);

  if (authContext) {
    minQuery = applyAuthFilters(minQuery, authContext);
    maxQuery = applyAuthFilters(maxQuery, authContext);
  }

  const [minResult, maxResult] = await Promise.all([minQuery, maxQuery]);

  return {
    lenders,
    retailers,
    statuses,
    primeSubprime,
    bdms,
    financeProducts,
    dateRange: {
      min: minResult.data?.[0]?.submitted_date || null,
      max: maxResult.data?.[0]?.submitted_date || null
    }
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
 * FIXED: Use SQL aggregation via RPC functions for efficient queries on large datasets
 */
export async function getDashboardStats() {
  const supabase = createAdminClient();

  try {
    // Use RPC function for efficient SQL aggregation
    const { data: stats, error: statsError } = await supabase.rpc('get_dashboard_stats');

    if (statsError) {
      console.error('RPC get_dashboard_stats failed:', statsError);
      // Fall back to manual queries if RPC not available
      return await getDashboardStatsFallback();
    }

    // Get last sync info
    const { data: lastSync } = await supabase
      .from('sync_log')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    return {
      totalApplications: stats?.totalApplications || 0,
      totalLoanValue: stats?.totalLoanValue || 0,
      totalCommission: stats?.totalCommission || 0,
      statusBreakdown: stats?.statusBreakdown || {},
      lastSync: lastSync || null
    };
  } catch (error) {
    console.error('getDashboardStats error:', error);
    return await getDashboardStatsFallback();
  }
}

/**
 * Fallback for dashboard stats if RPC function not available
 */
async function getDashboardStatsFallback() {
  const supabase = createAdminClient();

  // Get total count using Supabase's count functionality
  const { count: totalApplications, error: countError } = await supabase
    .from('application_decisions')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('Failed to get total count:', countError);
  }

  // Get status counts using multiple smaller queries
  const statuses = ['Created', 'Approved', 'Declined', 'Executed', 'Live', 'Cancelled', 'Expired', 'Referred'];
  const statusCounts: Record<string, number> = {};

  for (const status of statuses) {
    const { count } = await supabase
      .from('application_decisions')
      .select('*', { count: 'exact', head: true })
      .eq('status', status);
    if (count && count > 0) {
      statusCounts[status] = count;
    }
  }

  // Get totals using aggregate query - sample approach for fallback
  const { data: sample } = await supabase
    .from('application_decisions')
    .select('loan_amount, commission_amount')
    .limit(10000);

  const sampleSize = sample?.length || 0;
  const totalRecords = totalApplications || 0;
  const scaleFactor = sampleSize > 0 ? totalRecords / sampleSize : 1;

  const sampleLoanValue = sample?.reduce((sum, r) => sum + (r.loan_amount || 0), 0) || 0;
  const sampleCommission = sample?.reduce((sum, r) => sum + (r.commission_amount || 0), 0) || 0;

  // Get last sync info
  const { data: lastSync } = await supabase
    .from('sync_log')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(1)
    .single();

  return {
    totalApplications: totalApplications || 0,
    totalLoanValue: sampleLoanValue * scaleFactor,
    totalCommission: sampleCommission * scaleFactor,
    statusBreakdown: statusCounts,
    lastSync: lastSync || null
  };
}
