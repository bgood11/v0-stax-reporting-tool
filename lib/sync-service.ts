// Sync service for pulling Salesforce data into Supabase
import { createAdminClient } from './supabase/server';
import {
  fetchReportData,
  transformRecord,
  fetchAllApplicationDecisions,
  transformSOQLRecord
} from './salesforce';

interface SyncResult {
  success: boolean;
  recordCount?: number;
  error?: string;
  method?: 'soql' | 'report';
}

/**
 * Main sync function - pulls data from Salesforce and stores in Supabase
 * Used by the cron job at 1am daily
 *
 * Strategy: DELETE all existing data then INSERT fresh data
 * This ensures data stays in sync and removes stale records
 */
export async function syncDataToSupabase(): Promise<SyncResult> {
  const supabase = createAdminClient();

  // Create sync log entry
  const { data: syncLog, error: logError } = await supabase
    .from('sync_log')
    .insert({
      status: 'running',
      records_synced: 0
    })
    .select()
    .single();

  if (logError) {
    console.error('Failed to create sync log:', logError);
    // Continue anyway - sync is more important than logging
  }

  const syncLogId = syncLog?.id;

  try {
    console.log('Starting Salesforce data sync to Supabase...');

    // Try SOQL first (no row limit), fall back to Reports API if SOQL fails
    let rawData: any[];
    let method: 'soql' | 'report' = 'soql';
    let records: any[];

    try {
      rawData = await fetchAllApplicationDecisions();
      console.log(`Fetched ${rawData.length} records from Salesforce via SOQL`);
      records = rawData.map(transformSOQLRecord);
    } catch (soqlError: any) {
      console.error('SOQL fetch failed, falling back to Reports API:', soqlError.message);
      method = 'report';

      rawData = await fetchReportData();
      console.log(`Fetched ${rawData.length} records from Salesforce via Reports API (limited to 2,000)`);
      records = rawData.map(transformRecord);
    }

    console.log(`Transformed ${records.length} records`);

    // Delete all existing application decisions (fresh sync)
    console.log('Clearing existing data...');
    const { error: deleteError } = await supabase
      .from('application_decisions')
      .delete()
      .neq('id', ''); // Delete all rows

    if (deleteError) {
      throw new Error(`Failed to clear existing data: ${deleteError.message}`);
    }

    // Insert new records in batches (Supabase has limits on batch size)
    const BATCH_SIZE = 500;
    let insertedCount = 0;

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);

      // Map our record format to database schema
      const dbRecords = batch.map(r => ({
        id: r.id,
        application_number: r.ap_number,
        lender_name: r.lender_name,
        status: r.derived_status,
        submitted_date: r.created_date,
        approved_date: r.approved_date,
        declined_date: r.rejected_date,
        contract_signed_date: r.contract_signed_date,
        live_date: r.live_date,
        cancelled_date: r.cancelled_date,
        expired_date: r.expired_date,
        referred_date: r.referred_date,
        loan_amount: r.loan_amount || null,
        deposit_amount: r.deposit_amount || null,
        goods_amount: r.purchase_amount || null,
        retailer_name: r.retailer_name,
        parent_company: r.parent_company,
        bdm_name: r.bdm_name,
        finance_product: r.finance_product,
        apr: r.apr || null,
        term_months: r.terms_month || null,
        deferral_months: r.deferral_period || null,
        prime_subprime: r.prime_subprime,
        priority: r.priority || null,
        commission_amount: r.commission_amount || null,
        synced_at: new Date().toISOString()
      }));

      const { error: insertError } = await supabase
        .from('application_decisions')
        .insert(dbRecords);

      if (insertError) {
        console.error(`Batch insert failed at ${i}:`, insertError);
        throw new Error(`Failed to insert batch at ${i}: ${insertError.message}`);
      }

      insertedCount += batch.length;
      console.log(`Inserted ${insertedCount}/${records.length} records`);
    }

    // Update sync log on success
    if (syncLogId) {
      await supabase
        .from('sync_log')
        .update({
          completed_at: new Date().toISOString(),
          status: 'success',
          records_synced: insertedCount
        })
        .eq('id', syncLogId);
    }

    console.log(`Sync completed successfully: ${insertedCount} records (method: ${method})`);

    return { success: true, recordCount: insertedCount, method };

  } catch (error: any) {
    console.error('Sync failed:', error.message);

    // Update sync log with error
    if (syncLogId) {
      await supabase
        .from('sync_log')
        .update({
          completed_at: new Date().toISOString(),
          status: 'error',
          error_message: error.message
        })
        .eq('id', syncLogId);
    }

    return { success: false, error: error.message };
  }
}

/**
 * Get the last sync status from the database
 */
export async function getLastSyncStatus() {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('sync_log')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('Failed to get sync status:', error);
    return null;
  }

  return data;
}

/**
 * Get sync history
 */
export async function getSyncHistory(limit: number = 10) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('sync_log')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to get sync history:', error);
    return [];
  }

  return data || [];
}

// Export with the old name for backward compatibility with the cron job
export { syncDataToSupabase as syncDataToMemory };
